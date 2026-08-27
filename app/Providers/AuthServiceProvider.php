<?php

namespace App\Providers;

use App\Models\Admin;
use App\Support\Permission;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

/**
 * Registers one Gate per permission.
 *
 * This lets controllers, middleware and Blade all ask the same question
 * (`$user->can('submission:edit')` / `@can`) against the single permission
 * table, instead of each re-deriving authorisation from the role.
 */
class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        foreach (Permission::all() as $permission) {
            Gate::define($permission, function (Admin $admin) use ($permission) {
                // A deactivated account keeps its role but loses every
                // permission, so disabling an admin takes effect immediately.
                if (! $admin->isActive) {
                    return false;
                }

                return Permission::allows($admin->role, $permission);
            });
        }
    }
}
