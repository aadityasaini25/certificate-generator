<?php

namespace App\Models;

use App\Models\Concerns\HasCuidKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A document attached to a submission.
 *
 * Only the path relative to the storage root is stored, never an absolute
 * path, so the storage location can move without touching the database.
 */
class UploadedDocument extends Model
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

    protected $table = 'uploaded_documents';

    /** Records creation only; the row is never updated. */
    const CREATED_AT = 'uploadedAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'submissionId', 'documentType', 'originalName', 'storedName',
        'storagePath', 'mimeType', 'sizeBytes',
    ];

    protected function casts(): array
    {
        return [
            'sizeBytes' => 'integer',
            'uploadedAt' => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CertificateSubmission::class, 'submissionId');
    }
}
