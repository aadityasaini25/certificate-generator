@extends('layouts.public')
@section('title', config('certificate.app_name') . ' — ' . config('certificate.tagline'))

@section('content')
<section class="border-b border-line bg-surface">
    <div class="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div class="max-w-2xl">
            <span class="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                Online application portal
            </span>
            <h1 class="mt-5 text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
                Apply for your certificate without the paperwork
            </h1>
            <p class="mt-5 text-lg text-ink-soft text-pretty">
                Submit your certificate application online, attach the required documents, and track it
                through review until your certificate is issued.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
                <x-ui.button href="{{ route('request.create') }}" variant="cta" size="lg">Start an application</x-ui.button>
                <x-ui.button href="{{ route('status.index') }}" variant="secondary" size="lg">Check request status</x-ui.button>
                <x-ui.button href="{{ route('verify.index') }}" variant="secondary" size="lg">Verify a certificate</x-ui.button>
            </div>
        </div>
    </div>
</section>

<section class="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
    <h2 class="text-2xl font-semibold tracking-tight text-ink">How it works</h2>
    <p class="mt-2 max-w-2xl text-ink-soft">Four steps from application to issued certificate.</p>

    <ol class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @foreach ([
            ['Submit your details', 'Complete the application form with your applicant, company and certificate information.'],
            ['Attach documents', 'Upload the supporting documents required for your certificate type.'],
            ['Verification', 'Our team reviews the submission and may add remarks or request corrections.'],
            ['Certificate issued', 'Once approved, your certificate is generated and made available to download.'],
        ] as $i => [$title, $body])
            <li class="rounded-card border border-line bg-surface p-5 shadow-card">
                <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Step {{ $i + 1 }}</p>
                <h3 class="mt-1 text-base font-semibold text-ink">{{ $title }}</h3>
                <p class="mt-1.5 text-sm text-ink-soft">{{ $body }}</p>
            </li>
        @endforeach
    </ol>
</section>
@endsection
