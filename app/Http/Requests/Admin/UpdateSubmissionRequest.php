<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Admin edit of an applicant's details.
 *
 * Mirrors the public form's rules for the fields they share, so an admin
 * correcting a record cannot store something the public form would reject.
 */
class UpdateSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorised by the controller's permission gate.
    }

    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:100'],
            'lastName' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:254'],
            'companyName' => ['nullable', 'string', 'max:200'],
            'jobTitle' => ['nullable', 'string', 'max:150'],
            'location' => ['required', 'string', Rule::in(config('certificate.locations'))],
            'comments' => ['nullable', 'string', 'max:5000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'companyName' => trim((string) $this->input('companyName')) ?: null,
            'jobTitle' => trim((string) $this->input('jobTitle')) ?: null,
            'comments' => trim((string) $this->input('comments')) ?: null,
        ]);
    }
}
