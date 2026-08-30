<?php

namespace App\Console\Commands;

use App\Enums\AdminRole;
use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Creates an administrator account interactively.
 *
 * Production starts with an empty database and there is no admin seeder, so
 * this is the supported way to create the first account. It is deliberately
 * interactive: the password is read with hidden input, never passed as a
 * command-line argument (which would land in the shell history and in the
 * process list), never echoed, and never logged.
 */
class CreateAdminCommand extends Command
{
    /**
     * No arguments or options for the credentials on purpose — anything passed
     * on the command line is visible to `ps` and recorded in shell history.
     */
    protected $signature = 'admin:create';

    protected $description = 'Create an administrator account (interactive)';

    public function handle(): int
    {
        $this->line('');
        $this->info('Create an administrator');
        $this->line('The password is hidden as you type and is never displayed or logged.');
        $this->line('');

        // --- Email ----------------------------------------------------------
        $email = trim((string) $this->ask('Email address'));
        $email = mb_strtolower($email);

        $emailCheck = Validator::make(['email' => $email], [
            'email' => ['required', 'string', 'email', 'max:254'],
        ]);

        if ($emailCheck->fails()) {
            $this->error($emailCheck->errors()->first('email'));

            return self::FAILURE;
        }

        // --- Existing account -----------------------------------------------
        $existing = Admin::where('email', $email)->first();
        $isUpdate = false;

        if ($existing !== null) {
            $this->line('');
            $this->warn("An administrator with the email {$email} already exists.");
            $this->line("  name: {$existing->name}");
            $this->line('  role: '.$existing->role->label());
            $this->line('  status: '.($existing->isActive ? 'active' : 'deactivated'));
            $this->line('');

            // Refuse by default. Only an explicit confirmation proceeds, and
            // even then ONLY the password changes — name, role and active flag
            // are left exactly as they are.
            if (! $this->confirm('Reset this account\'s PASSWORD? Nothing else will be changed.', false)) {
                $this->line('');
                $this->info('No changes made.');

                return self::SUCCESS;
            }

            $isUpdate = true;
        }

        // --- Name and role (new accounts only) -------------------------------
        $name = null;
        $role = null;

        if (! $isUpdate) {
            $name = trim((string) $this->ask('Full name'));

            if ($name === '' || mb_strlen($name) > 191) {
                $this->error('A name is required and must be 191 characters or fewer.');

                return self::FAILURE;
            }

            $role = $this->choice(
                'Role',
                [
                    AdminRole::SuperAdmin->value => AdminRole::SuperAdmin->label(),
                    AdminRole::Admin->value => AdminRole::Admin->label(),
                    AdminRole::Reviewer->value => AdminRole::Reviewer->label(),
                ],
                AdminRole::SuperAdmin->value
            );
        }

        // --- Password --------------------------------------------------------
        $password = (string) $this->secret('Password (hidden)');
        $confirm = (string) $this->secret('Confirm password (hidden)');

        if ($password !== $confirm) {
            $this->error('The passwords do not match. No changes made.');

            return self::FAILURE;
        }

        $passwordCheck = Validator::make(['password' => $password], [
            'password' => [
                'required',
                'string',
                Password::min(12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    // Checks the password against known breach corpora via the
                    // k-anonymity API. If the service cannot be reached — quite
                    // possible on locked-down shared hosting — Laravel treats
                    // the password as acceptable rather than blocking account
                    // creation.
                    ->uncompromised(),
            ],
        ], [
            'password.min' => 'The password must be at least 12 characters.',
        ]);

        if ($passwordCheck->fails()) {
            $this->line('');
            // Only the RULE that failed is reported — never the password itself.
            foreach ($passwordCheck->errors()->get('password') as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        // --- Write ------------------------------------------------------------
        try {
            if ($isUpdate) {
                // Password only. Name, role and isActive are untouched.
                $existing->forceFill(['passwordHash' => Hash::make($password)])->save();

                $this->line('');
                $this->info("Password reset for {$email}.");
                $this->line('  Name, role and status were left unchanged.');

                return self::SUCCESS;
            }

            $admin = Admin::create([
                'email' => $email,
                'name' => $name,
                'passwordHash' => Hash::make($password),
                'role' => $role,
                'isActive' => true,
            ]);
        } catch (\Throwable $e) {
            // The message may contain query context, but never the password —
            // it is only ever passed to Hash::make().
            $this->error('Could not create the administrator: '.$e->getMessage());

            return self::FAILURE;
        } finally {
            // Reduce how long the plaintext lingers in memory.
            $password = $confirm = '';
        }

        $this->line('');
        $this->info("Administrator created: {$admin->email}");
        $this->line('  name: '.$admin->name);
        $this->line('  role: '.$admin->role->label());
        $this->line('');
        $this->line('Sign in at '.rtrim((string) config('app.url'), '/').'/admin/login');

        return self::SUCCESS;
    }
}
