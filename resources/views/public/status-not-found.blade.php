@extends('layouts.public')
@section('title', 'Request status · ' . config('certificate.app_name'))
@section('robots', 'noindex, nofollow')
@section('referrer', 'no-referrer')

@section('content')
<div class="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
    <x-ui.card>
        <x-ui.card-body class="sm:px-7 sm:py-8">
            <div class="flex flex-col items-center text-center">
                <span class="flex size-12 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
                    <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                </span>
                <h1 class="mt-4 text-xl font-semibold text-ink">Request Not Found</h1>
                <p class="mt-2 max-w-sm text-sm text-ink-soft">
                    We couldn't find a request matching this reference ID. Please check the reference ID and try again.
                </p>
            </div>
            <div class="mt-7 border-t border-line pt-6">
                <p class="mb-3 text-sm font-medium text-ink">Try another reference ID</p>
                @include('public.partials.status-form', ['reference' => ''])
            </div>
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
