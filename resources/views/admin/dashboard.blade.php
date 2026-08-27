@extends('layouts.admin')
@section('title', 'Dashboard')

@section('content')
@php
    $tones = [
        'neutral' => 'bg-status-neutral-bg', 'info' => 'bg-status-info-bg',
        'success' => 'bg-status-success-bg', 'danger' => 'bg-status-danger-bg',
        'accent' => 'bg-status-accent-bg',
    ];
@endphp
<div class="space-y-7">
    <div>
        <h1 class="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p class="mt-1.5 text-sm text-ink-soft">Welcome back, {{ auth('admin')->user()->name }}.</p>
    </div>

    <section aria-label="Submission statistics"
             class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <a href="{{ route('admin.submissions.index') }}"
           class="group rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
            <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-medium text-ink-soft">Total Submissions</p>
                <span aria-hidden="true" class="size-2.5 rounded-full bg-brand-50"></span>
            </div>
            <p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">{{ $total }}</p>
            <p class="mt-1 text-xs text-ink-muted group-hover:text-brand-700">View submissions</p>
        </a>

        @foreach (\App\Enums\SubmissionStatus::displayOrder() as $status)
            <a href="{{ route('admin.submissions.index', ['status' => $status->value]) }}"
               class="group rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
                <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-medium text-ink-soft">{{ $status->label() }}</p>
                    <span aria-hidden="true" class="size-2.5 rounded-full {{ $tones[$status->tone()] }}"></span>
                </div>
                <p class="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">{{ $byStatus[$status->value] }}</p>
                <p class="mt-1 text-xs text-ink-muted group-hover:text-brand-700">View submissions</p>
            </a>
        @endforeach
    </section>

    <x-ui.card>
        <x-ui.card-header title="Recent Submissions" description="The five most recent certificate requests.">
            <x-slot:action>
                <a href="{{ route('admin.submissions.index') }}"
                   class="text-sm font-medium text-brand-700 hover:text-brand-800">View all</a>
            </x-slot:action>
        </x-ui.card-header>
        <x-ui.card-body class="px-0 py-0 sm:px-0">
            @include('admin.submissions.partials.table', ['submissions' => $recent])
        </x-ui.card-body>
    </x-ui.card>
</div>
@endsection
