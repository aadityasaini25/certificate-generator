<?php

namespace App\Services;

use App\Enums\SubmissionStatus;
use App\Models\Admin;
use App\Models\Certificate;
use App\Models\CertificateSubmission;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Certificate generation.
 *
 * Ordering is chosen so that a COMMITTED certificate always has its PDF on
 * disk. The PDF is rendered and written first; only then does the transaction
 * run, and if it fails the orphaned file is removed. The opposite order could
 * leave a record whose document does not exist — a visible defect — whereas a
 * stray unreferenced file is harmless and is cleaned up anyway.
 *
 * Duplicate prevention does not rely on the "does one already exist?" check,
 * which is only a fast path. The real guarantee is the UNIQUE constraint on
 * certificates.submissionId: two concurrent requests both pass the check, but
 * only one INSERT can succeed.
 *
 * Callers must already have verified the certificate:generate permission.
 */
class CertificateIssuer
{
    private const MAX_ATTEMPTS = 5;
    private const SNAPSHOT_VERSION = 1;

    public function __construct(
        private readonly CertificateNumberAllocator $numbers,
        private readonly CertificateRenderer $renderer,
        private readonly DocumentStorage $storage,
    ) {
    }

    /**
     * @return array{ok: bool, code?: string, message?: string, certificate?: Certificate}
     */
    public function issue(CertificateSubmission $submission, Admin $admin): array
    {
        $submission->loadMissing(['documents', 'certificate']);

        // Fast path only — the unique constraint actually prevents duplicates.
        if ($submission->certificate !== null) {
            return [
                'ok' => false,
                'code' => 'ALREADY_EXISTS',
                'message' => 'A certificate has already been issued for this submission ('
                    . $submission->certificate->certificateNo . ').',
            ];
        }

        if ($submission->status !== SubmissionStatus::Approved) {
            return [
                'ok' => false,
                'code' => 'NOT_APPROVED',
                'message' => 'Only approved submissions can be issued a certificate. '
                    . 'This submission is currently ' . $submission->status->value . '.',
            ];
        }

        for ($attempt = 1; $attempt <= self::MAX_ATTEMPTS; $attempt++) {
            $issuedAt = now();
            $certificateNo = $this->numbers->next($issuedAt);
            $snapshot = $this->buildSnapshot($submission, $certificateNo, $issuedAt, $admin);

            // 1. Render.
            try {
                $pdf = $this->renderer->render($snapshot);
            } catch (\Throwable $e) {
                Log::error('[certificates] PDF rendering failed: ' . $e->getMessage());

                return ['ok' => false, 'code' => 'FAILED',
                        'message' => 'The certificate document could not be produced.'];
            }

            // 2. Write BEFORE committing, so a committed record can never
            //    reference a document that does not exist.
            try {
                $relativePath = $this->writePdf($pdf, $issuedAt);
            } catch (\Throwable $e) {
                Log::error('[certificates] writing the PDF failed: ' . $e->getMessage());

                return ['ok' => false, 'code' => 'FAILED',
                        'message' => 'The certificate document could not be saved.'];
            }

            // 3. Commit. Anything failing from here rolls the file back too.
            try {
                $certificate = DB::transaction(function () use ($submission, $certificateNo, $snapshot, $relativePath, $issuedAt, $admin) {
                    // Atomic compare-and-set: the row moves APPROVED ->
                    // COMPLETED only if it is STILL approved, so a concurrent
                    // status change cannot be lost. This is also the ONLY code
                    // path that may set COMPLETED.
                    $moved = CertificateSubmission::query()
                        ->whereKey($submission->getKey())
                        ->where('status', SubmissionStatus::Approved->value)
                        ->update(['status' => SubmissionStatus::Completed->value]);

                    if ($moved === 0) {
                        throw new \RuntimeException('SUBMISSION_CONFLICT');
                    }

                    $certificate = Certificate::create([
                        'certificateNo' => $certificateNo,
                        'submissionId' => $submission->getKey(),
                        'templateKey' => $snapshot['templateKey'],
                        'snapshot' => $snapshot,
                        'filePath' => $relativePath,
                        'issuedAt' => $issuedAt,
                        'issuedById' => $admin->getKey(),
                    ]);

                    // Audit trail in the existing remarks table — no second
                    // history model.
                    $submission->remarks()->createMany([
                        [
                            'adminId' => $admin->getKey(),
                            'message' => "Certificate generated. Certificate No: {$certificateNo}.",
                            'isInternal' => true,
                        ],
                        [
                            'adminId' => $admin->getKey(),
                            'message' => "Certificate issued and submission completed. Certificate No: {$certificateNo}.",
                            'fromStatus' => SubmissionStatus::Approved->value,
                            'toStatus' => SubmissionStatus::Completed->value,
                            'isInternal' => true,
                        ],
                    ]);

                    return $certificate;
                });

                return ['ok' => true, 'certificate' => $certificate];
            } catch (\Throwable $e) {
                // The transaction rolled back, so the file it would have
                // referenced is now an orphan.
                $this->deletePdf($relativePath);

                if ($e->getMessage() === 'SUBMISSION_CONFLICT') {
                    return ['ok' => false, 'code' => 'CONFLICT',
                            'message' => 'The submission changed while the certificate was being generated. Reload and try again.'];
                }

                if ($e instanceof QueryException && ($e->errorInfo[1] ?? null) === 1062) {
                    // Another request issued this submission's certificate first.
                    if (str_contains($e->getMessage(), 'submissionId')) {
                        $existing = Certificate::where('submissionId', $submission->getKey())->first();

                        return ['ok' => false, 'code' => 'ALREADY_EXISTS',
                                'message' => 'A certificate has already been issued for this submission'
                                    . ($existing ? " ({$existing->certificateNo})" : '') . '.'];
                    }
                    // Lost the race for this number — take the next and retry.
                    if ($attempt < self::MAX_ATTEMPTS) {
                        continue;
                    }
                }

                Log::error('[certificates] generation failed: ' . $e->getMessage());

                return ['ok' => false, 'code' => 'FAILED',
                        'message' => 'The certificate could not be issued. Please try again.'];
            }
        }

        return ['ok' => false, 'code' => 'FAILED',
                'message' => 'Could not allocate a unique certificate number after ' . self::MAX_ATTEMPTS . ' attempts.'];
    }

    /**
     * Freezes everything the certificate needs.
     *
     * The PDF is produced from this snapshot, never from a live database read,
     * so editing the submission afterwards cannot change an issued certificate.
     */
    private function buildSnapshot(CertificateSubmission $s, string $certificateNo, $issuedAt, Admin $admin): array
    {
        $parts = $s->nameParts();
        $orgName = trim((string) config('certificate.organisation.name'));

        return [
            'version' => self::SNAPSHOT_VERSION,
            'certificateNo' => $certificateNo,
            'issuedAt' => $issuedAt->toIso8601String(),
            'templateKey' => 'default',
            'submission' => [
                'id' => $s->getKey(),
                'referenceNo' => $s->referenceNo,
                'firstName' => $parts['firstName'],
                'lastName' => $parts['lastName'],
                'applicantName' => $s->applicantName,
                'email' => $s->applicantEmail,
                'companyName' => $s->companyName,
                'jobTitle' => $s->applicantDesignation,
                'location' => $s->location,
                'comments' => $s->additionalNotes,
                'submittedAt' => $s->submittedAt?->toIso8601String(),
                'documents' => $s->documents->map(fn ($d) => [
                    'originalName' => $d->originalName,
                    'mimeType' => $d->mimeType,
                    'sizeBytes' => $d->sizeBytes,
                ])->all(),
            ],
            'issuedBy' => ['name' => $admin->name, 'email' => $admin->email],
            'organisation' => [
                // Falls back to a neutral label; the renderer stamps the
                // certificate as unconfigured so it cannot be mistaken for an
                // issued document.
                'name' => $orgName !== '' ? $orgName : 'Organisation not configured',
                'address' => (string) config('certificate.organisation.address'),
                'website' => (string) config('certificate.organisation.website'),
                'isPlaceholder' => $orgName === '',
            ],
        ];
    }

    private function writePdf(string $pdf, $issuedAt): string
    {
        $relativeDir = 'certificates/' . $issuedAt->format('Y/m');
        $fileName = (string) Str::uuid() . '.pdf';
        $absoluteDir = $this->storage->storageRoot() . '/' . $relativeDir;

        if (! is_dir($absoluteDir)) {
            mkdir($absoluteDir, 0750, true);
        }

        file_put_contents($absoluteDir . '/' . $fileName, $pdf);
        chmod($absoluteDir . '/' . $fileName, 0640);

        return $relativeDir . '/' . $fileName;
    }

    /** Never throws: cleanup failing must not mask the original error. */
    private function deletePdf(string $relativePath): void
    {
        try {
            $absolute = $this->storage->resolve($relativePath);
            if (is_file($absolute)) {
                unlink($absolute);
            }
        } catch (\Throwable $e) {
            Log::error('[certificates] could not remove orphaned PDF ' . $relativePath . ': ' . $e->getMessage());
        }
    }
}
