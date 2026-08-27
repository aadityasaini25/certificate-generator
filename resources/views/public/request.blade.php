@extends('layouts.public')

@section('title', 'Request a certificate verification · ' . config('certificate.app_name'))

@section('content')
<div class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
    <header class="mb-8">
        <h1 class="text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
            Request a certificate verification
        </h1>
        <p class="mt-3 text-ink-soft text-pretty">
            Complete the form below and upload your document. Our team will review your request and get back to you.
        </p>
        <p class="mt-4 text-sm text-ink-muted">
            Fields marked with <span class="text-status-danger" aria-hidden="true">*</span><span class="sr-only">an asterisk</span> are required.
        </p>
    </header>

    <x-ui.card>
        <x-ui.card-body class="sm:px-8 sm:py-8">
            <form method="POST" action="{{ route('request.store') }}" enctype="multipart/form-data"
                  class="space-y-7" novalidate>
                @csrf

                @if ($errors->any())
                    <div role="alert"
                         class="rounded-card border border-status-danger bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
                        {{ $errors->first('form') ?: 'Please correct the highlighted fields.' }}
                    </div>
                @endif

                <div class="grid gap-5 sm:grid-cols-2">
                    <x-ui.field name="firstName" label="First Name" required autocomplete="given-name" />
                    <x-ui.field name="lastName" label="Last Name" required autocomplete="family-name" />
                </div>

                <x-ui.field name="email" label="Email" type="email" required autocomplete="email" inputmode="email" />

                <div class="grid gap-5 sm:grid-cols-2">
                    <x-ui.field name="companyName" label="Company Name" autocomplete="organization" />
                    <x-ui.field name="jobTitle" label="Job Title" autocomplete="organization-title" />
                </div>

                {{-- Location --}}
                <div class="space-y-1.5">
                    <label for="location" class="block text-sm font-medium text-ink">
                        Location<span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
                        <span class="sr-only">(required)</span>
                    </label>
                    <div class="relative">
                        <select id="location" name="location" class="field-control appearance-none pr-10"
                                @if ($errors->has('location')) aria-invalid="true" aria-describedby="location-error" @endif>
                            <option value="">Please select</option>
                            @foreach ($locations as $location)
                                <option value="{{ $location }}" @selected(old('location') === $location)>{{ $location }}</option>
                            @endforeach
                        </select>
                        <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>
                    @error('location')
                        <p id="location-error" class="text-sm text-status-danger">{{ $message }}</p>
                    @enderror
                </div>

                {{-- Comments --}}
                <div class="space-y-1.5">
                    <label for="comments" class="block text-sm font-medium text-ink">Comments</label>
                    <textarea id="comments" name="comments" rows="6" class="field-control resize-y"
                              @if ($errors->has('comments')) aria-invalid="true" @endif>{{ old('comments') }}</textarea>
                    @error('comments')
                        <p class="text-sm text-status-danger">{{ $message }}</p>
                    @enderror
                </div>

                {{-- Document --}}
                <div class="space-y-2">
                    <label for="document" class="block text-sm font-medium text-ink">
                        Upload your document(s) for verification<span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
                        <span class="sr-only">(required)</span>
                    </label>

                    <div class="rounded-card border-2 border-dashed {{ $errors->has('document') ? 'border-status-danger bg-status-danger-bg' : 'border-line-strong bg-surface-muted' }} px-6 py-8 text-center">
                        <input id="document" name="document" type="file"
                               accept="{{ config('certificate.uploads.accept_attribute') }}"
                               class="mx-auto block w-full max-w-sm text-sm text-ink-soft file:mr-3 file:rounded-control file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
                               @if ($errors->has('document')) aria-invalid="true" aria-describedby="document-error" @endif>
                        <p class="mt-2 text-xs text-ink-muted">PDF or ZIP</p>
                    </div>

                    <p class="text-xs leading-relaxed text-ink-muted">
                        {{ config('certificate.uploads.help_text') }}
                    </p>
                    @error('document')
                        <p id="document-error" class="text-sm text-status-danger">{{ $message }}</p>
                    @enderror
                </div>

                {{-- Privacy consent --}}
                <div class="space-y-1.5">
                    <div class="flex items-start gap-3">
                        <input id="privacyConsent" name="privacyConsent" type="checkbox" value="1"
                               @checked(old('privacyConsent'))
                               class="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-brand-600"
                               @if ($errors->has('privacyConsent')) aria-invalid="true" @endif>
                        <label for="privacyConsent" class="text-sm leading-relaxed text-ink-soft">
                            I agree that {{ config('certificate.privacy.organisation_name') }} can use my data for the
                            purposes of dealing with my request, in accordance with the
                            @if (config('certificate.privacy.policy_url'))
                                <a href="{{ config('certificate.privacy.policy_url') }}" target="_blank" rel="noopener noreferrer"
                                   class="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800">{{ config('certificate.privacy.organisation_name') }} Online Privacy Statement</a>
                            @else
                                {{-- No URL is invented: it renders as plain text until one is configured. --}}
                                <span class="font-medium text-ink">{{ config('certificate.privacy.organisation_name') }} Online Privacy Statement</span>
                            @endif.
                            <span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
                        </label>
                    </div>
                    @error('privacyConsent')
                        <p class="text-sm text-status-danger">{{ $message }}</p>
                    @enderror
                </div>

                {{-- CAPTCHA --}}
                <div class="space-y-1.5">
                    @if ($turnstileSiteKey)
                        <div class="cf-turnstile" data-sitekey="{{ $turnstileSiteKey }}" data-theme="light"></div>
                        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                    @else
                        <div class="flex items-start gap-3 rounded-card border border-line bg-surface-muted px-4 py-3">
                            <p class="text-sm text-ink-soft">
                                CAPTCHA is not configured.
                                <span class="text-ink-muted">Set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to enable it. Required before production.</span>
                            </p>
                        </div>
                    @endif
                    @error('captcha')
                        <p class="text-sm text-status-danger">{{ $message }}</p>
                    @enderror
                </div>

                <div class="flex justify-center pt-1">
                    <x-ui.button type="submit" variant="cta" size="lg" class="min-w-56">Send Your Request</x-ui.button>
                </div>
            </form>
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
