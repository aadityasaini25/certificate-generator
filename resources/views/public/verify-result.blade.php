@extends('layouts.public')
@section('title', 'Certificate verification · ' . config('certificate.app_name'))
@section('robots', 'noindex, nofollow')

@section('content')
@php $c = $certificate; @endphp
<div class="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="mb-6 flex flex-col items-center text-center">
        <span class="flex size-14 items-center justify-center rounded-full bg-status-success-bg text-status-success">
            <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
        </span>
        <p class="mt-4 text-xs font-semibold uppercase tracking-widest text-status-success">Certificate verified</p>
        <h1 class="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{{ $c['certificateNumber'] }}</h1>
        <p class="mt-3 max-w-md text-sm text-ink-soft text-pretty">
            This certificate was issued by {{ $c['organisationName'] }} on
            {{ $c['issuedAt']?->format('d M Y') }} and is valid.
        </p>
    </div>

    <x-ui.card>
        <x-ui.card-header title="Certificate information" description="As recorded when the certificate was issued." />
        <x-ui.card-body>
            <dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                @foreach ([
                    'Applicant name' => $c['applicantName'],
                    'Company name' => $c['companyName'],
                    'Job title' => $c['jobTitle'],
                    'Location' => $c['location'],
                    'Issue date' => $c['issuedAt']?->format('d M Y'),
                    'Verification status' => 'Verified',
                ] as $label => $value)
                    <div>
                        <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">{{ $label }}</dt>
                        <dd class="mt-1 text-sm text-ink">{{ $value ?: '—' }}</dd>
                    </div>
                @endforeach
            </dl>
        </x-ui.card-body>
    </x-ui.card>

    @if ($c['hasDocument'])
        <x-ui.card class="mt-5">
            <x-ui.card-header title="Certificate document" description="The original certificate exactly as it was issued." />
            <x-ui.card-body>
                <div class="flex flex-col gap-3 sm:flex-row">
                    <x-ui.button href="{{ route('verify.pdf', $c['certificateNumber']) }}" target="_blank"
                                 rel="noopener noreferrer" class="flex-1">View Certificate</x-ui.button>
                    <x-ui.button href="{{ route('verify.pdf', $c['certificateNumber']) }}?download=1"
                                 variant="secondary" class="flex-1">Download Certificate</x-ui.button>
                </div>
            </x-ui.card-body>
        </x-ui.card>
    @endif

    <p class="mt-6 text-center text-sm">
        <a href="{{ route('verify.index') }}" class="font-medium text-brand-700 hover:text-brand-800">Verify another certificate</a>
    </p>
</div>
@endsection
