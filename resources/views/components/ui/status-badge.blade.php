@props(['status'])

@php
    // $status is an App\Enums\SubmissionStatus.
    $tones = [
        'neutral' => 'bg-status-neutral-bg text-status-neutral',
        'info' => 'bg-status-info-bg text-status-info',
        'success' => 'bg-status-success-bg text-status-success',
        'danger' => 'bg-status-danger-bg text-status-danger',
        'accent' => 'bg-status-accent-bg text-status-accent',
    ];
@endphp

<span {{ $attributes->merge(['class' => 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' . $tones[$status->tone()]]) }}>
    <span aria-hidden="true" class="size-1.5 rounded-full bg-current opacity-70"></span>
    {{ $status->label() }}
</span>
