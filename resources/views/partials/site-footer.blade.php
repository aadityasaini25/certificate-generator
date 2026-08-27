<footer class="mt-auto border-t border-line bg-surface">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>&copy; {{ date('Y') }} {{ config('certificate.app_name') }}. All rights reserved.</p>
        <p>
            Need help?
            <a href="mailto:{{ config('certificate.support_email') }}"
               class="font-medium text-brand-700 underline-offset-4 hover:underline">
                {{ config('certificate.support_email') }}
            </a>
        </p>
    </div>
</footer>
