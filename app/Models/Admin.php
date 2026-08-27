<?php

namespace App\Models;

use App\Enums\AdminRole;
use App\Models\Concerns\HasCuidKey;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;

/**
 * An administrator of the certificate system.
 *
 * Maps onto the pre-existing `admins` table, which does not follow Laravel's
 * conventions: the primary key is a cuid string and the timestamp columns are
 * camelCase. Both are declared explicitly below rather than by renaming
 * columns, so the live data keeps working.
 */
class Admin extends Authenticatable
{
    use HasCuidKey;

    /** cuid string key, not an auto-incrementing integer. */
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'admins';

    /** The existing schema names these camelCase, not created_at/updated_at. */
    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = ['email', 'name', 'passwordHash', 'role', 'isActive'];

    /**
     * `passwordHash` is always hidden: it must never reach a view, a JSON
     * response, or a log line.
     */
    protected $hidden = ['passwordHash'];

    protected function casts(): array
    {
        return [
            'role' => AdminRole::class,
            'isActive' => 'boolean',
            'lastLoginAt' => 'datetime',
            'createdAt' => 'datetime',
            'updatedAt' => 'datetime',
        ];
    }

    /**
     * Tells Laravel's auth system where the hash lives.
     *
     * The column is `passwordHash`, not Laravel's default `password`.
     */
    public function getAuthPassword(): string
    {
        return $this->passwordHash;
    }

    public function reviewedSubmissions(): HasMany
    {
        return $this->hasMany(CertificateSubmission::class, 'reviewedById');
    }

    public function remarks(): HasMany
    {
        return $this->hasMany(SubmissionRemark::class, 'adminId');
    }

    public function issuedCertificates(): HasMany
    {
        return $this->hasMany(Certificate::class, 'issuedById');
    }
}
