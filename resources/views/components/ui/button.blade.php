@props([
    'variant' => 'primary',
    'size' => 'md',
    'type' => 'button',
    'href' => null,
])

@php
    // Mirrors the previous implementation's button recipe so the two look
    // identical. Colours come from design tokens, never hard-coded hex.
    $variants = [
        'primary' => 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-card',
        'cta' => 'bg-cta-500 text-white hover:bg-cta-600 active:bg-cta-700 shadow-card',
        'secondary' => 'bg-surface text-ink border border-line-strong hover:bg-surface-muted active:bg-line',
        'outline' => 'bg-transparent text-brand-700 border border-brand-200 hover:bg-brand-50',
        'ghost' => 'bg-transparent text-ink-soft hover:bg-surface-muted hover:text-ink',
        'danger' => 'bg-status-danger text-white hover:brightness-110 active:brightness-95 shadow-card',
    ];
    $sizes = [
        'sm' => 'h-8 px-3 text-sm gap-1.5',
        'md' => 'h-10 px-4 text-sm gap-2',
        'lg' => 'h-11 px-5 text-base gap-2',
    ];
    $classes = 'inline-flex items-center justify-center rounded-control font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 '
        . ($variants[$variant] ?? $variants['primary']) . ' ' . ($sizes[$size] ?? $sizes['md']);
@endphp

@if ($href)
    <a href="{{ $href }}" {{ $attributes->merge(['class' => $classes]) }}>{{ $slot }}</a>
@else
    <button type="{{ $type }}" {{ $attributes->merge(['class' => $classes]) }}>{{ $slot }}</button>
@endif
