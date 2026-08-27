<?php

namespace App\Models;

use App\Enums\SubmissionStatus;
use App\Models\Concerns\HasCuidKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A certificate request submitted through the public form.
 *
 * Frequently searched fields are real columns; optional or evolving form
 * fields live in the `additionalData` JSON column, so the form can change
 * without a migration.
 */
class CertificateSubmission extends Model
{
    use HasCuidKey;

    /** cuid string key, not an auto-incrementing integer. */
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'certificate_submissions';

    /** This table records creation as `submittedAt`. */
    const CREATED_AT = 'submittedAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'referenceNo', 'applicantName', 'applicantEmail', 'applicantPhone',
        'applicantDesignation', 'location', 'companyName', 'additionalNotes',
        'additionalData', 'declarationAccepted', 'declaredBy', 'declaredAt',
        'status', 'submitterIp', 'reviewedAt', 'reviewedById',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubmissionStatus::class,
            'additionalData' => 'array',
            'declarationAccepted' => 'boolean',
            'declaredAt' => 'datetime',
            'submittedAt' => 'datetime',
            'updatedAt' => 'datetime',
            'reviewedAt' => 'datetime',
        ];
    }

    public function documents(): HasMany
    {
        return $this->hasMany(UploadedDocument::class, 'submissionId');
    }

    public function remarks(): HasMany
    {
        return $this->hasMany(SubmissionRemark::class, 'submissionId');
    }

    public function certificate(): HasOne
    {
        return $this->hasOne(Certificate::class, 'submissionId');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewedById');
    }

    /** Recovers the two name parts the applicant originally typed. */
    public function nameParts(): array
    {
        $extra = $this->additionalData ?? [];
        $first = is_string($extra['firstName'] ?? null) ? $extra['firstName'] : null;
        $last = is_string($extra['lastName'] ?? null) ? $extra['lastName'] : null;

        if ($first !== null || $last !== null) {
            return ['firstName' => $first ?? '', 'lastName' => $last ?? ''];
        }

        // Rows created before the parts were recorded only have the full name.
        $bits = preg_split('/\s+/', trim((string) $this->applicantName), 2);

        return ['firstName' => $bits[0] ?? '', 'lastName' => $bits[1] ?? ''];
    }
}
