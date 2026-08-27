@props(['title' => null, 'description' => null, 'action' => null])

<div {{ $attributes->merge(['class' => 'flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6']) }}>
    <div class="min-w-0 space-y-1">
        <h2 class="text-base font-semibold text-ink">{{ $title }}</h2>
        @if ($description)
            <p class="text-sm text-ink-muted">{{ $description }}</p>
        @endif
    </div>
    @if ($action)
        <div class="shrink-0">{{ $action }}</div>
    @endif
</div>
