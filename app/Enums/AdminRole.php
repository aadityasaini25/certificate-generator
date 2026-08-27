<?php

namespace App\Enums;

/**
 * Administrator roles.
 *
 * Authorisation is expressed as permissions rather than role checks scattered
 * through the code — see App\Support\Permission.
 */
enum AdminRole: string
{
    case SuperAdmin = 'SUPER_ADMIN';
    case Admin = 'ADMIN';
    case Reviewer = 'REVIEWER';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super administrator',
            self::Admin => 'Administrator',
            self::Reviewer => 'Reviewer',
        };
    }
}
