@props([
    'name',
    'label',
    'type' => 'text',
    'required' => false,
    'value' => null,
    'hint' => null,
    'placeholder' => null,
    'autocomplete' => null,
    'inputClass' => '',
])

@php
    $id = $attributes->get('id', $name);
    $error = $errors->first($name);
    $describedBy = collect([$hint ? "{$id}-hint" : null, $error ? "{$id}-error" : null])
        ->filter()->implode(' ');
@endphp

<div class="space-y-1.5">
    <label for="{{ $id }}" class="block text-sm font-medium text-ink">
        {{ $label }}
        @if ($required)
            <span class="ml-0.5 text-status-danger" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
        @endif
    </label>

    <input
        id="{{ $id }}"
        name="{{ $name }}"
        type="{{ $type }}"
        value="{{ old($name, $value) }}"
        @if ($placeholder) placeholder="{{ $placeholder }}" @endif
        @if ($autocomplete) autocomplete="{{ $autocomplete }}" @endif
        @if ($error) aria-invalid="true" @endif
        @if ($describedBy) aria-describedby="{{ $describedBy }}" @endif
        {{ $attributes->except(['id'])->merge(['class' => 'field-control ' . $inputClass]) }}
    >

    @if ($hint)
        <p id="{{ $id }}-hint" class="text-xs text-ink-muted">{{ $hint }}</p>
    @endif
    @if ($error)
        <p id="{{ $id }}-error" class="text-sm text-status-danger">{{ $error }}</p>
    @endif
</div>
