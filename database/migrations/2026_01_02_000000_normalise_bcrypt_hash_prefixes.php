<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Rewrites `$2b$` bcrypt prefixes to `$2y$`.
 *
 * The hashes were written by Node's bcryptjs, which emits the `$2b$` prefix.
 * PHP's `password_verify()` accepts it, but `password_get_info()` reports the
 * algorithm as "unknown", so Laravel's Hash::check() refuses the hash with
 * "This password does not use the Bcrypt algorithm."
 *
 * `$2y$` and `$2b$` denote the same algorithm — both are the corrected bcrypt
 * that fixed the 2011 sign-extension bug — and differ only in the prefix
 * string. Swapping it therefore preserves the hash: the same password still
 * verifies, and a wrong one still fails. This was confirmed against the live
 * hash before the migration was written.
 *
 * Doing this as a data migration (rather than disabling Laravel's algorithm
 * check in config) keeps the application on stock Laravel hashing, and means
 * administrators never have to reset their passwords.
 */
return new class extends Migration
{
    public function up(): void
    {
        $updated = DB::table('admins')
            ->where('passwordHash', 'like', '$2b$%')
            ->update([
                'passwordHash' => DB::raw("CONCAT('\$2y\$', SUBSTRING(passwordHash, 5))"),
            ]);

        if ($updated > 0) {
            echo "  normalised {$updated} bcrypt hash prefix(es) from \$2b\$ to \$2y\$\n";
        }
    }

    public function down(): void
    {
        DB::table('admins')
            ->where('passwordHash', 'like', '$2y$%')
            ->update([
                'passwordHash' => DB::raw("CONCAT('\$2b\$', SUBSTRING(passwordHash, 5))"),
            ]);
    }
};
