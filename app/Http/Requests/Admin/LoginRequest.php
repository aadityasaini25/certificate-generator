<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Admin sign-in input.
 *
 * Deliberately minimal: the only job is to reject malformed input before it
 * reaches the database. Password *policy* is never enforced at login, because
 * rejecting a sign-in for a policy reason would leak information about the
 * stored credential.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:254'],
            // Bounded so absurd input never reaches bcrypt.
            'password' => ['required', 'string', 'max:200'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email is required.',
            'email.email' => 'Enter a valid email address.',
            'password.required' => 'Password is required.',
        ];
    }
}
