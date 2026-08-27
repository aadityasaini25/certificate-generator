@extends('layouts.public')
@section('title', 'Certificate verification · ' . config('certificate.app_name'))
@section('robots', 'noindex, nofollow')

@section('content')
<div class="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
    <x-ui.card>
        <x-ui.card-body class="sm:px-7 sm:py-8">
            <div class="flex flex-col items-center text-center">
                <span class="flex size-12 items-center justify-center rounded-full bg-status-neutral-bg text-status-neutral">
                    <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="m2 2 20 20"/><path d="M5 5v8c0 5 3.5 7.5 6.34 8.95a1 1 0 0 0 .67.01C16.5 20.5 20 18 20 13V6a1 1 0 0 0-1-1c-2 0-4.5-1.2-6.24-2.72"/>
                    </svg>
                </span>
                <p class="mt-4 text-xs font-semibold uppercase tracking-widest text-status-neutral">Not currently valid</p>
                <p class="mt-2 font-mono text-lg font-semibold text-ink">{{ $certificate['certificateNumber'] }}</p>
                {{-- Personal details and the revocation reason are deliberately withheld. --}}
                <p class="mt-3 max-w-sm text-sm text-ink-soft">
                    This certificate was issued on {{ $certificate['issuedAt']?->format('d M Y') }} but is no
                    longer valid. Please contact us if you need more information.
                </p>
            </div>
        </x-ui.card-body>
    </x-ui.card>
    <p class="mt-6 text-center text-sm">
        <a href="{{ route('verify.index') }}" class="font-medium text-brand-700 hover:text-brand-800">Verify another certificate</a>
    </p>
</div>
@endsection
