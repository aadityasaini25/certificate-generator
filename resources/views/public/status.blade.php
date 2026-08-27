@extends('layouts.public')
@section('title', 'Check your request status · ' . config('certificate.app_name'))

@section('content')
<div class="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="mb-8 text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-ink text-balance">Check Your Request Status</h1>
        <p class="mt-3 text-ink-soft text-pretty">
            Enter your reference ID to check the current status of your request.
        </p>
    </div>

    <x-ui.card>
        <x-ui.card-body class="sm:px-7 sm:py-7">
            @include('public.partials.status-form', ['reference' => $reference ?? ''])
        </x-ui.card-body>
    </x-ui.card>

    <div class="mt-6 rounded-card border border-line bg-surface px-4 py-3.5">
        <p class="text-sm text-ink-soft">
            Your reference ID was shown when you submitted your request and looks like
            <span class="font-mono text-ink">CRT-YYYY-XXXXXX</span>. No account is needed.
        </p>
    </div>
</div>
@endsection
