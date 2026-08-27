<form method="POST" action="{{ route('status.lookup') }}" class="space-y-4" novalidate>
    @csrf
    <div class="space-y-1.5">
        <label for="reference" class="block text-sm font-medium text-ink">Reference ID</label>
        <input id="reference" name="reference" type="text" autocomplete="off" autocapitalize="characters"
               spellcheck="false" maxlength="64" value="{{ old('reference', $reference ?? '') }}"
               placeholder="CRT-YYYY-XXXXXX"
               class="field-control font-mono uppercase"
               @if ($errors->has('reference')) aria-invalid="true" aria-describedby="reference-error" @endif>
        @error('reference')
            <p id="reference-error" class="text-sm text-status-danger">{{ $message }}</p>
        @enderror
    </div>
    <x-ui.button type="submit" size="lg" class="w-full">Check Status</x-ui.button>
</form>
