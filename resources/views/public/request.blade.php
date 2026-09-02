@extends('layouts.public')

@section('title', 'Request a certificate verification · ' . config('certificate.app_name'))

@section('content')

{{--
    Hero band. Full-bleed by design: layouts.public yields straight into
    <main> with no container, so the section sets its own gutters and they
    line up with the site header's max-w-6xl.

    The photograph is served from public/images, not a remote host, so this
    page still makes zero external requests.
--}}
<section class="page-hero flex min-h-[320px] items-end sm:min-h-[335px] lg:min-h-[345px]"
         style="background-image: url('{{ asset('images/hero-certificate.jpg') }}')">
    {{-- items-end pins the copy to the bottom of the band; min-height keeps the
         band the height it had when the text sat in the middle. --}}
    <div class="mx-auto w-full max-w-6xl px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:px-8 lg:pb-14">
        <div class="max-w-2xl">
            {{-- No eyebrow label: the heading is the first element, so it has no
                 top margin and sits where the label used to. --}}
            <h1 class="text-3xl font-semibold leading-tight tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">
                Verify Documents Form
            </h1>
            <p class="mt-4 max-w-xl text-base leading-relaxed text-white/80 text-pretty sm:mt-5 sm:text-lg">
                Verify branded documents to confirm their authenticity and validity.
            </p>
        </div>
    </div>
</section>

{{--
    Informational text between the hero and the form. Sits on the page
    background, not inside the form card, and shares the form's max-w-3xl so
    the two columns line up.
--}}
<section class="mx-auto w-full max-w-3xl px-4 pt-12 pb-2 sm:px-6 sm:pt-16 sm:pb-4">
    <p class="text-base leading-relaxed text-ink-soft text-pretty">
        We offer customers various certificates and reports to confirm the results of our
        testing, inspection and certification. We also provide a free service to verify
        documents, ensuring they are genuine before you rely on them for any purpose.
    </p>
    <p class="mt-5 text-base italic leading-relaxed text-ink-soft text-pretty">
        To use our document verification service, please complete the form and attach the
        document(s) for verification.
    </p>
</section>

{{-- No hero-overlap: the informational section now sits between the hero and
     the card, so a negative margin here would pull the form over that text. --}}
<div class="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:pb-20">
    <x-ui.card class="shadow-overlay">
        <x-ui.card-body class="sm:px-8 sm:py-9">
            <form method="POST" action="{{ route('request.store') }}" enctype="multipart/form-data"
                  class="space-y-9" novalidate>
                @csrf

                @if ($errors->any())
                    <div role="alert"
                         class="rounded-card border border-status-danger bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
                        {{ $errors->first('form') ?: 'Please correct the highlighted fields.' }}
                    </div>
                @endif

                <p class="text-sm text-ink-muted">
                    Fields marked with <span class="text-status-danger" aria-hidden="true">*</span><span class="sr-only">an asterisk</span> are required.
                </p>

                {{-- ---------------------------------------------------------
                     Section 1 — applicant details.
                     Grouping is presentational only: every field keeps its
                     original name, order and validation.
                --------------------------------------------------------- --}}
                <section class="space-y-5">
                    <h2 class="form-section-title">Your details</h2>

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
                </section>

                {{-- ---------------------------------------------------------
                     Section 2 — the request itself.
                --------------------------------------------------------- --}}
                <section class="space-y-5">
                    <h2 class="form-section-title">Your request</h2>

                    {{-- Comments --}}
                    <div class="space-y-1.5">
                        <label for="comments" class="block text-sm font-medium text-ink">Comments</label>
                        <textarea id="comments" name="comments" rows="5" class="field-control resize-y"
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

                        {{--
                            The input covers the whole panel at zero opacity, so the
                            entire area is clickable while the control stays a real
                            file input: keyboard focus, the label's `for`, and form
                            submission are all unchanged. With JavaScript disabled
                            the picker still opens; only the filename readout below
                            stops updating.
                        --}}
                        <div class="dropzone px-6 py-9 text-center" data-invalid="{{ $errors->has('document') ? 'true' : 'false' }}">
                            <input id="document" name="document" type="file"
                                   accept="{{ config('certificate.uploads.accept_attribute') }}"
                                   data-upload-input
                                   @if ($errors->has('document')) aria-invalid="true" aria-describedby="document-error" @endif>

                            <svg class="mx-auto size-9 text-ink-muted" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                                 stroke-linejoin="round" aria-hidden="true">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <path d="M14 2v6h6"/>
                                <path d="M12 18v-6"/>
                                <path d="m9 15 3-3 3 3"/>
                            </svg>

                            <p class="mt-3 text-sm font-medium text-ink">
                                <span class="text-brand-700 underline underline-offset-4">Choose a file</span>
                                <span class="text-ink-soft">or drag it here</span>
                            </p>
                            <p class="mt-1 text-xs text-ink-muted">PDF or ZIP</p>
                            <p class="mt-3 text-sm font-medium text-brand-800" data-upload-name hidden></p>
                        </div>

                        <p class="text-xs leading-relaxed text-ink-muted">
                            {{ config('certificate.uploads.help_text') }}
                        </p>
                        @error('document')
                            <p id="document-error" class="text-sm text-status-danger">{{ $message }}</p>
                        @enderror
                    </div>
                </section>

                {{-- ---------------------------------------------------------
                     Section 3 — consent.
                --------------------------------------------------------- --}}
                <section class="space-y-5">
                    <h2 class="form-section-title">Consent</h2>

                    <div class="space-y-1.5">
                        <div class="flex items-start gap-3 rounded-card bg-surface-muted px-4 py-3.5">
                            <input id="privacyConsent" name="privacyConsent" type="checkbox" value="1"
                                   @checked(old('privacyConsent'))
                                   class="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-brand-600"
                                   @if ($errors->has('privacyConsent')) aria-invalid="true" @endif>
                            @php
                                $privacyOrg = config('certificate.privacy.organisation_name');
                                $privacyUrl = config('certificate.privacy.policy_url');
                            @endphp
                            <label for="privacyConsent" class="text-sm leading-relaxed text-ink-soft">
                                I agree that {{ $privacyOrg }} can use my data for the purposes of dealing
                                with my request, in accordance with the
                                {{-- Directives sit flush against the tags: any whitespace here lands
                                     between the link text and the full stop. No URL is invented, so
                                     this renders as plain text until one is configured. --}}
                                @if ($privacyUrl)<a href="{{ $privacyUrl }}" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800">{{ $privacyOrg }} Online Privacy Statement</a>@else<span class="font-medium text-ink">{{ $privacyOrg }} Online Privacy Statement</span>@endif.<span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
                            </label>
                        </div>
                        @error('privacyConsent')
                            <p class="text-sm text-status-danger">{{ $message }}</p>
                        @enderror
                    </div>
                </section>

                <div class="border-t border-line pt-7">
                    {{-- The button is inline-flex, so mx-auto cannot centre it; the
                         flex wrapper does. Full width on mobile, hugged on desktop. --}}
                    <div class="sm:flex sm:justify-center">
                        <x-ui.button type="submit" variant="cta" size="lg" class="w-full sm:w-auto sm:min-w-64">
                            Send Your Request
                        </x-ui.button>
                    </div>
                    <p class="mt-3 text-center text-xs text-ink-muted">
                        You will receive a reference number to track your request.
                    </p>
                </div>
            </form>
        </x-ui.card-body>
    </x-ui.card>
</div>

{{-- Shows which file was picked, since the native control is visually hidden. --}}
<script>
    (function () {
        var input = document.querySelector('[data-upload-input]');
        var label = document.querySelector('[data-upload-name]');
        if (!input || !label) return;
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (file) {
                label.textContent = file.name;
                label.hidden = false;
            } else {
                label.textContent = '';
                label.hidden = true;
            }
        });
    })();
</script>
@endsection
