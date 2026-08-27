<?php

namespace App\Models;

use App\Models\Concerns\HasCuidKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An issued certificate.
 *
 * `snapshot` is the frozen copy of the submission data at issue time and is
 * the source of truth for everything the certificate says. Rendering or
 * verifying a certificate must read the snapshot, never the live submission,
 * so a later edit cannot change an already-issued document.
 */
class Certificate extends Model
{
    use HasCuidKey;

    /** cuid string key, not an auto-incrementing integer. */
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The schema uses datetime(3) columns, and the previous implementation
     * wrote milliseconds. Laravel's default format truncates to whole
     * seconds, which would make rows created in the same second — the two
     * remarks written by certificate generation, for instance — impossible to
     * order deterministically.
     */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $table = 'certificates';

    /** Issued once; never updated in the ordinary course of events. */
    const CREATED_AT = 'issuedAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'certificateNo', 'submissionId', 'templateKey', 'snapshot',
        'filePath', 'issuedById', 'validFrom', 'validUntil',
        'revokedAt', 'revokeReason',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'issuedAt' => 'datetime',
            'validFrom' => 'datetime',
            'validUntil' => 'datetime',
            'revokedAt' => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CertificateSubmission::class, 'submissionId');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'issuedById');
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }
}
