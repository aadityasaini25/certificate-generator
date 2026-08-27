<?php

namespace App\Models;

use App\Enums\SubmissionStatus;
use App\Models\Concerns\HasCuidKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A remark on a submission, and the audit trail.
 *
 * One table serves both purposes: a plain note has no status columns, while a
 * status change records fromStatus/toStatus. There is deliberately no separate
 * history table.
 */
class SubmissionRemark extends Model
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

    protected $table = 'submission_remarks';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = null;

    protected $fillable = [
        'submissionId', 'adminId', 'message', 'fromStatus', 'toStatus', 'isInternal',
    ];

    protected function casts(): array
    {
        return [
            'fromStatus' => SubmissionStatus::class,
            'toStatus' => SubmissionStatus::class,
            'isInternal' => 'boolean',
            'createdAt' => 'datetime',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(CertificateSubmission::class, 'submissionId');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'adminId');
    }

    /** True when this entry records a status change rather than a plain note. */
    public function isStatusChange(): bool
    {
        return $this->toStatus !== null;
    }
}
