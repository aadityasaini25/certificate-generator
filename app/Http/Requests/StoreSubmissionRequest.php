<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Public certificate request form.
 *
 * Mirrors the rules the previous implementation enforced. Everything the
 * browser checks is checked again here — the client-side pass exists only to
 * give fast feedback.
 */
class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxBytes = (int) config('certificate.uploads.max_bytes');

        return [
            'firstName' => ['required', 'string', 'max:100'],
            'lastName' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:254'],
            'companyName' => ['nullable', 'string', 'max:200'],
            'jobTitle' => ['nullable', 'string', 'max:150'],
            'location' => ['required', 'string', Rule::in(config('certificate.locations'))],
            'comments' => ['nullable', 'string', 'max:5000'],

            // The document is mandatory. Size is bounded here as a fast
            // rejection; DocumentStorage repeats it and adds the magic-byte
            // check, which is what actually decides the file type.
            'document' => ['required', 'file', 'max:' . (int) ($maxBytes / 1024)],

            'privacyConsent' => ['accepted'],
        ];
    }

    public function messages(): array
    {
        $limitMb = (int) floor((int) config('certificate.uploads.max_bytes') / (1024 * 1024));

        return [
            'firstName.required' => 'First name is required.',
            'lastName.required' => 'Last name is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Enter a valid email address.',
            'location.required' => 'Please select a location.',
            'location.in' => 'Please select a location from the list.',
            'document.required' => 'Please attach your document.',
            'document.max' => "File is larger than {$limitMb}MB. Submit the form without an "
                . 'attachment and we will contact you.',
            'privacyConsent.accepted' => 'You must accept the privacy statement.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'firstName' => trim((string) $this->input('firstName')),
            'lastName' => trim((string) $this->input('lastName')),
            'email' => trim((string) $this->input('email')),
            'companyName' => trim((string) $this->input('companyName')) ?: null,
            'jobTitle' => trim((string) $this->input('jobTitle')) ?: null,
            'comments' => trim((string) $this->input('comments')) ?: null,
        ]);
    }
}
