<?php

namespace App\Services;

use App\Enums\SubmissionStatus;
use App\Models\CertificateSubmission;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Persists a public certificate request.
 *
 * The submission and its document are written in a single transaction, so a
 * failure can never leave a submission row without the document the applicant
 * attached.
 */
class SubmissionCreator
{
    private const MAX_REFERENCE_ATTEMPTS = 5;

    public function __construct(
        private readonly ReferenceNumberGenerator $references,
    ) {
    }

    /**
     * @param  array{originalName:string,storedName:string,storagePath:string,mimeType:string,sizeBytes:int}  $document
     */
    public function create(array $values, array $document, ?string $submitterIp): CertificateSubmission
    {
        $submittedAt = now();
        $fullName = trim($values['firstName'] . ' ' . $values['lastName']);

        for ($attempt = 1; $attempt <= self::MAX_REFERENCE_ATTEMPTS; $attempt++) {
            $referenceNo = $this->references->generate($submittedAt);

            try {
                return DB::transaction(function () use ($values, $document, $submitterIp, $referenceNo, $submittedAt, $fullName) {
                    $submission = CertificateSubmission::create([
                        'referenceNo' => $referenceNo,

                        // applicantName is the canonical, searchable name; the
                        // original two parts are kept in additionalData so
                        // nothing the applicant typed is lost.
                        'applicantName' => $fullName,
                        'applicantEmail' => strtolower($values['email']),
                        'applicantDesignation' => $values['jobTitle'] ?? null,
                        'location' => $values['location'],
                        'companyName' => $values['companyName'] ?? null,
                        'additionalNotes' => $values['comments'] ?? null,

                        'additionalData' => [
                            'firstName' => $values['firstName'],
                            'lastName' => $values['lastName'],
                            'source' => 'public-request-form',
                        ],

                        // Applicants never choose their own status.
                        'status' => SubmissionStatus::Pending,
                        'declarationAccepted' => true,
                        'declaredBy' => $fullName,
                        'declaredAt' => $submittedAt,
                        'submittedAt' => $submittedAt,
                        'submitterIp' => $submitterIp,
                    ]);

                    $submission->documents()->create([
                        'documentType' => 'SUPPORTING_DOCUMENT',
                        'originalName' => $document['originalName'],
                        'storedName' => $document['storedName'],
                        'storagePath' => $document['storagePath'],
                        'mimeType' => $document['mimeType'],
                        'sizeBytes' => $document['sizeBytes'],
                    ]);

                    return $submission;
                });
            } catch (QueryException $e) {
                // Reference number collided — generate another and try again.
                if ($this->isDuplicateKey($e) && $attempt < self::MAX_REFERENCE_ATTEMPTS) {
                    continue;
                }
                throw $e;
            }
        }

        throw new \RuntimeException(
            'Could not allocate a unique reference number after ' . self::MAX_REFERENCE_ATTEMPTS . ' attempts.'
        );
    }

    private function isDuplicateKey(QueryException $e): bool
    {
        return ($e->errorInfo[1] ?? null) === 1062;
    }
}
