<form method="POST" action="{{ route('verify.lookup') }}" class="space-y-4" novalidate>
    @csrf
    <div class="space-y-1.5">
        <label for="certificateNumber" class="block text-sm font-medium text-ink">Certificate number</label>
        <input id="certificateNumber" name="certificateNumber" type="text" autocomplete="off"
               autocapitalize="characters" spellcheck="false" maxlength="64"
               value="{{ old('certificateNumber') }}" placeholder="CERT-YYYY-NNNNNN"
               class="field-control font-mono uppercase"
               @if ($errors->has('certificateNumber')) aria-invalid="true" aria-describedby="cert-error" @endif>
        @error('certificateNumber')
            <p id="cert-error" class="text-sm text-status-danger">{{ $message }}</p>
        @enderror
    </div>
    <x-ui.button type="submit" size="lg" class="w-full">Verify Certificate</x-ui.button>
</form>
