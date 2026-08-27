@extends('layouts.public')

@section('title', 'Request submitted · ' . config('certificate.app_name'))

@section('content')
<div class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
    <x-ui.card>
        <x-ui.card-body class="sm:px-8 sm:py-8">
            <div class="flex flex-col items-center px-2 py-8 text-center sm:px-6">
                <span class="flex size-12 items-center justify-center rounded-full bg-status-success-bg text-status-success">
                    <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
                    </svg>
                </span>

                <h1 class="mt-4 text-xl font-semibold text-ink">
                    Your request has been submitted successfully.
                </h1>
                <p class="mt-2 max-w-md text-sm text-ink-soft">
                    Our team will review your information and contact you if required.
                </p>

                {{-- The reference is the only way to track the request later, so
                     it is given prominence and made easy to copy. --}}
                <div class="mt-7 w-full max-w-sm rounded-card border border-line bg-surface-muted px-5 py-5">
                    <p class="text-xs font-medium uppercase tracking-wide text-ink-muted">Reference ID</p>
                    <p class="mt-2 select-all font-mono text-2xl font-semibold tracking-tight text-ink">
                        {{ $referenceNo }}
                    </p>
                </div>

                <p class="mt-4 max-w-sm text-sm text-ink-muted">
                    Save this reference ID — you will need it to check the status of your request.
                </p>

                <x-ui.button href="{{ route('status.show', $referenceNo) }}" size="lg" class="mt-6">
                    Check Request Status
                </x-ui.button>
            </div>
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
