<?php

namespace App\Services;

use App\Enums\SubmissionStatus;
use App\Models\CertificateSubmission;

/**
 * Public request status tracking.
 *
 * Looks a submission up by its existing reference ID. This is NOT certificate
 * verification: it reports the progress of a request, whereas
 * CertificateVerifier reports an issued certificate.
 *
 * Every published field is copied out explicitly, so a column added to the
 * schema later cannot silently become public. Deliberately absent: database
 * ids, email, phone, submitter IP, uploaded documents, file paths, admin
 * identities, and the text of any remark.
 */
class RequestStatusService
{
    /** How far through the workflow each status sits. */
    private const RANK = [
        'PENDING' => 0,
        'UNDER_REVIEW' => 1,
        // REJECTED shares a rank with APPROVED: it is the other outcome of
        // review, not a later stage.
        'APPROVED' => 2,
        'REJECTED' => 2,
        'COMPLETED' => 4,
    ];

    private const CERTIFICATE_RANK = 3;

    /**
     * Masks a name to its first part plus initials: "MAMTA SAINI" -> "MAMTA S."
     *
     * Enough for an applicant to recognise their own request without
     * publishing a full name to anyone holding the reference.
     */
    public function maskName(string $fullName): string
    {
        $parts = preg_split('/\s+/', trim($fullName), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($parts === []) {
            return '—';
        }
        if (count($parts) === 1) {
            return $parts[0];
        }

        $first = array_shift($parts);
        $initials = implode(' ', array_map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)) . '.', $parts));

        return $first . ' ' . $initials;
    }

    public function presentName(string $fullName): ?string
    {
        return match (config('certificate.status_applicant_name')) {
            'hidden' => null,
            'full' => $fullName,
            default => $this->maskName($fullName),
        };
    }

    /**
     * @return array|null Public payload, or null when the reference is unknown.
     */
    public function lookup(string $reference): ?array
    {
        $submission = CertificateSubmission::query()
            ->where('referenceNo', $reference)
            ->with([
                'certificate:id,submissionId,certificateNo,issuedAt,revokedAt',
                // Status transitions only. `message` is deliberately not
                // selected: remarks are internal notes.
                'remarks' => fn ($q) => $q->whereNotNull('toStatus')
                    ->select(['id', 'submissionId', 'toStatus', 'createdAt'])
                    ->orderBy('createdAt'),
            ])
            ->first();

        if ($submission === null) {
            return null;
        }

        $certificate = $submission->certificate;

        // COMPLETED is meant to imply an issued certificate. If one is missing
        // the request is not finished, so it is presented as approved and in
        // progress rather than complete — without revealing the inconsistency.
        $awaitingCertificate = $submission->status === SubmissionStatus::Completed && $certificate === null;
        $displayStatus = $awaitingCertificate ? SubmissionStatus::Approved : $submission->status;

        $publiclyVerifiable = $certificate !== null
            && $certificate->revokedAt === null
            && $submission->status === SubmissionStatus::Completed;

        return [
            'reference' => $submission->referenceNo,
            'applicantName' => $this->presentName($submission->applicantName),
            'submittedAt' => $submission->submittedAt,
            'status' => $displayStatus,
            'awaitingCertificate' => $awaitingCertificate,
            'timeline' => $this->buildTimeline(
                $displayStatus,
                $submission->submittedAt,
                $submission->remarks,
                $certificate?->issuedAt,
            ),
            'certificateNumber' => $publiclyVerifiable ? $certificate->certificateNo : null,
        ];
    }

    /**
     * Builds the progress timeline.
     *
     * Stages are marked reached from the current status, because the workflow
     * only allows arriving at a status by passing through the earlier ones.
     * Dates come from recorded history and are left null when unknown: a stage
     * is never given an invented timestamp, and an unreached stage is never
     * drawn as complete.
     */
    private function buildTimeline($status, $submittedAt, $remarks, $certificateIssuedAt): array
    {
        $firstReached = function (SubmissionStatus $target) use ($remarks) {
            foreach ($remarks as $remark) {
                if ($remark->toStatus === $target) {
                    return $remark->createdAt;
                }
            }

            return null;
        };

        $currentRank = self::RANK[$status->value];
        $state = fn (int $rank) => $rank < $currentRank ? 'done' : ($rank === $currentRank ? 'current' : 'upcoming');

        // Rejected: show the path actually taken and stop there.
        if ($status === SubmissionStatus::Rejected) {
            $stages = [
                ['key' => 'submitted', 'label' => 'Request Submitted', 'state' => 'done', 'at' => $submittedAt],
            ];

            // Only shown when the request genuinely passed through review; a
            // request can be rejected straight from pending.
            if ($reviewedAt = $firstReached(SubmissionStatus::UnderReview)) {
                $stages[] = ['key' => 'under_review', 'label' => 'Under Review', 'state' => 'done', 'at' => $reviewedAt];
            }

            $stages[] = ['key' => 'rejected', 'label' => 'Rejected', 'state' => 'current',
                         'at' => $firstReached(SubmissionStatus::Rejected)];

            return $stages;
        }

        return [
            ['key' => 'submitted', 'label' => 'Request Submitted',
             'state' => $currentRank > 0 ? 'done' : 'current', 'at' => $submittedAt],
            ['key' => 'under_review', 'label' => 'Under Review',
             'state' => $state(1), 'at' => $firstReached(SubmissionStatus::UnderReview)],
            ['key' => 'approved', 'label' => 'Approved',
             'state' => $state(2), 'at' => $firstReached(SubmissionStatus::Approved)],
            ['key' => 'certificate', 'label' => 'Certificate Generated',
             // Only complete once a certificate actually exists.
             'state' => $certificateIssuedAt
                 ? ($currentRank > self::CERTIFICATE_RANK ? 'done' : 'current')
                 : 'upcoming',
             'at' => $certificateIssuedAt],
            ['key' => 'completed', 'label' => 'Completed',
             'state' => $state(4), 'at' => $firstReached(SubmissionStatus::Completed)],
        ];
    }
}
