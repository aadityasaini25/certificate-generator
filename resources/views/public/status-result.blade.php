@extends('layouts.public')
@section('title', 'Request status · ' . config('certificate.app_name'))
@section('robots', 'noindex, nofollow')
@section('referrer', 'no-referrer')

@section('content')
@php $r = $request; @endphp
<div class="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
    <div class="mb-6 text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Request Status</h1>
        <p class="mt-2 font-mono text-lg text-ink-soft">{{ $r['reference'] }}</p>
    </div>

    <x-ui.card>
        <x-ui.card-header title="Current status">
            <x-slot:action><x-ui.status-badge :status="$r['status']" /></x-slot:action>
        </x-ui.card-header>
        <x-ui.card-body>
            <p class="text-sm text-ink-soft">
                {{ $r['awaitingCertificate']
                    ? config('certificate.awaiting_certificate_message')
                    : $r['status']->publicMessage() }}
            </p>

            <dl class="mt-5 grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
                <div>
                    <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Reference ID</dt>
                    <dd class="mt-1 font-mono text-sm text-ink">{{ $r['reference'] }}</dd>
                </div>
                @if ($r['applicantName'])
                    <div>
                        <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Applicant</dt>
                        <dd class="mt-1 text-sm text-ink">{{ $r['applicantName'] }}</dd>
                    </div>
                @endif
                <div>
                    <dt class="text-xs font-medium uppercase tracking-wide text-ink-muted">Submitted</dt>
                    <dd class="mt-1 text-sm text-ink">{{ $r['submittedAt']?->format('d M Y') ?? '—' }}</dd>
                </div>
            </dl>
        </x-ui.card-body>
    </x-ui.card>

    <x-ui.card class="mt-5">
        <x-ui.card-header title="Progress" description="The stages your request has reached so far." />
        <x-ui.card-body>
            <ol class="space-y-0">
                @foreach ($r['timeline'] as $i => $stage)
                    @php
                        $isLast = $i === count($r['timeline']) - 1;
                        $isFailure = $stage['key'] === 'rejected';
                    @endphp
                    <li class="relative flex gap-4 pb-6 last:pb-0">
                        @unless ($isLast)
                            <span aria-hidden="true"
                                  class="absolute left-[13px] top-7 h-full w-0.5 {{ $stage['state'] === 'done' ? 'bg-brand-500' : 'bg-line' }}"></span>
                        @endunless

                        <span aria-hidden="true" @class([
                            'relative flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                            'border-status-danger bg-status-danger text-white' => $isFailure,
                            'border-brand-500 bg-brand-500 text-white' => ! $isFailure && $stage['state'] === 'done',
                            'border-brand-500 bg-surface text-brand-600' => ! $isFailure && $stage['state'] === 'current',
                            'border-line-strong bg-surface text-ink-muted' => $stage['state'] === 'upcoming',
                        ])>
                            @if ($isFailure)
                                <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            @elseif ($stage['state'] === 'done')
                                <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m20 6-11 11-5-5"/></svg>
                            @elseif ($stage['state'] === 'current')
                                <span class="size-2.5 rounded-full bg-current"></span>
                            @else
                                <span class="size-2 rounded-full border-2 border-current"></span>
                            @endif
                        </span>

                        <div class="min-w-0 flex-1 pt-0.5">
                            <p class="text-sm font-medium {{ $stage['state'] === 'upcoming' ? 'text-ink-muted' : 'text-ink' }}">
                                {{ $stage['label'] }}
                            </p>
                            @if ($stage['at'])
                                <p class="mt-0.5 text-xs text-ink-muted">{{ $stage['at']->format('d M Y') }}</p>
                            @elseif ($stage['state'] === 'current')
                                <p class="mt-0.5 text-xs text-ink-muted">In progress</p>
                            @endif
                        </div>
                    </li>
                @endforeach
            </ol>
        </x-ui.card-body>
    </x-ui.card>

    @if ($r['certificateNumber'])
        <x-ui.card class="mt-5">
            <x-ui.card-header title="Certificate Available" description="Your certificate has been issued." />
            <x-ui.card-body>
                <p class="text-sm text-ink-soft">
                    Certificate number <span class="font-mono font-medium text-ink">{{ $r['certificateNumber'] }}</span>.
                    Use the verification page to view and download it.
                </p>
                <div class="mt-4">
                    <x-ui.button href="{{ route('verify.show', $r['certificateNumber']) }}">Verify Certificate</x-ui.button>
                </div>
            </x-ui.card-body>
        </x-ui.card>
    @endif

    <p class="mt-6 text-center text-sm">
        <a href="{{ route('status.index') }}" class="font-medium text-brand-700 hover:text-brand-800">Check another request</a>
    </p>
</div>
@endsection
