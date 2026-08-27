@extends('layouts.public')
@section('title', 'Verify a certificate · ' . config('certificate.app_name'))

@section('content')
<div class="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="mb-8 text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-ink text-balance">Verify a certificate</h1>
        <p class="mt-3 text-ink-soft text-pretty">
            Enter the certificate number exactly as it appears on the certificate to confirm that it was
            issued by us and to view the original document.
        </p>
    </div>

    <x-ui.card>
        <x-ui.card-body class="sm:px-7 sm:py-7">@include('public.partials.verify-form')</x-ui.card-body>
    </x-ui.card>

    <div class="mt-6 rounded-card border border-line bg-surface px-4 py-3.5">
        <p class="text-sm text-ink-soft">
            Certificate numbers look like <span class="font-mono text-ink">CERT-YYYY-NNNNNN</span> and are
            printed on the certificate itself. No account is needed.
        </p>
    </div>
</div>
@endsection
