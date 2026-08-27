<?php

namespace App\Services;

use App\Enums\SubmissionStatus;
use App\Models\Certificate;
use Illuminate\Support\Facades\Log;

/**
 * Public certificate verification.
 *
 * Reads from Certificate.snapshot — the data frozen at issue time — not from
 * the live submission. A certificate must always represent what was approved
 * and printed, even if an administrator later edits the source record.
 *
 * Every field returned is copied out explicitly. Deliberately absent: database
 * ids, the submission id, admin identities, the internal workflow status,
 * remarks, the submitter's IP, the stored file path, and the applicant's
 * email address.
 */
class CertificateVerifier
{
    public const VERIFIED = 'VERIFIED';
    public const NOT_CURRENTLY_VALID = 'NOT_CURRENTLY_VALID';
    public const NOT_FOUND = 'NOT_FOUND';

    /**
     * @return array{outcome: string, certificate?: array}
     */
    public function verify(string $certificateNumber): array
    {
        $certificate = Certificate::query()
            ->where('certificateNo', $certificateNumber)
            ->with('submission:id,status')
            ->first();

        if ($certificate === null) {
            return ['outcome' => self::NOT_FOUND];
        }

        // Business rule: only a genuinely issued certificate is publicly
        // verifiable. Checked rather than assumed.
        if ($certificate->submission?->status !== SubmissionStatus::Completed) {
            return ['outcome' => self::NOT_FOUND];
        }

        if ($certificate->revokedAt !== null) {
            return [
                'outcome' => self::NOT_CURRENTLY_VALID,
                'certificate' => [
                    'certificateNumber' => $certificate->certificateNo,
                    'issuedAt' => $certificate->issuedAt,
                    'withdrawnAt' => $certificate->revokedAt,
                    // revokeReason is internal and is never published.
                ],
            ];
        }

        $snapshot = $certificate->snapshot;

        if (! is_array($snapshot) || ! isset($snapshot['submission'])) {
            // The record exists but its frozen data is unreadable. Publishing a
            // half-built result would be worse than reporting nothing.
            Log::error('[verify] unreadable snapshot for ' . $certificate->certificateNo);

            return ['outcome' => self::NOT_FOUND];
        }

        $s = $snapshot['submission'];
        $name = trim(($s['firstName'] ?? '') . ' ' . ($s['lastName'] ?? ''))
            ?: ($s['applicantName'] ?? '—');

        return [
            'outcome' => self::VERIFIED,
            'certificate' => [
                'certificateNumber' => $certificate->certificateNo,
                'applicantName' => $name,
                'companyName' => $this->blankToNull($s['companyName'] ?? null),
                'jobTitle' => $this->blankToNull($s['jobTitle'] ?? null),
                'location' => $this->blankToNull($s['location'] ?? null),
                'issuedAt' => $certificate->issuedAt,
                'organisationName' => $snapshot['organisation']['name'] ?? '',
                'hasDocument' => (bool) $certificate->filePath,
                // Note: $s['email'], ['referenceNo'], ['comments'], ['documents']
                // and ['id'] are all available here and are NOT published.
            ],
        ];
    }

    /**
     * Resolves the stored PDF for a publicly downloadable certificate.
     *
     * Returns null for anything the public may not download, so a caller
     * cannot distinguish "no such certificate" from "not currently valid".
     */
    public function publicFile(string $certificateNumber): ?Certificate
    {
        $certificate = Certificate::query()
            ->where('certificateNo', $certificateNumber)
            ->with('submission:id,status')
            ->first();

        if ($certificate === null
            || $certificate->filePath === null
            || $certificate->revokedAt !== null
            || $certificate->submission?->status !== SubmissionStatus::Completed) {
            return null;
        }

        return $certificate;
    }

    private function blankToNull(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
