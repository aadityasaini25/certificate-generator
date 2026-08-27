<?php

namespace App\Support;

use App\Enums\AdminRole;

/**
 * Role-based authorisation.
 *
 * Authorisation is expressed as permissions, not as role checks scattered
 * through the codebase. Call sites ask "may this admin do X?" rather than
 * "is this admin a SUPER_ADMIN?", so re-scoping a role means editing this one
 * table.
 */
final class Permission
{
    public const SUBMISSION_READ = 'submission:read';
    public const SUBMISSION_EDIT = 'submission:edit';
    public const SUBMISSION_DECIDE = 'submission:decide';
    public const CERTIFICATE_GENERATE = 'certificate:generate';
    public const ADMIN_MANAGE = 'admin:manage';

    /** Which permissions each role carries. */
    private const ROLE_PERMISSIONS = [
        AdminRole::SuperAdmin->value => [
            self::SUBMISSION_READ,
            self::SUBMISSION_EDIT,
            self::SUBMISSION_DECIDE,
            self::CERTIFICATE_GENERATE,
            self::ADMIN_MANAGE,
        ],
        AdminRole::Admin->value => [
            self::SUBMISSION_READ,
            self::SUBMISSION_EDIT,
            self::SUBMISSION_DECIDE,
            self::CERTIFICATE_GENERATE,
        ],
        AdminRole::Reviewer->value => [
            self::SUBMISSION_READ,
        ],
    ];

    public static function all(): array
    {
        return [
            self::SUBMISSION_READ,
            self::SUBMISSION_EDIT,
            self::SUBMISSION_DECIDE,
            self::CERTIFICATE_GENERATE,
            self::ADMIN_MANAGE,
        ];
    }

    public static function forRole(AdminRole $role): array
    {
        return self::ROLE_PERMISSIONS[$role->value] ?? [];
    }

    public static function allows(AdminRole $role, string $permission): bool
    {
        return in_array($permission, self::forRole($role), true);
    }
}
