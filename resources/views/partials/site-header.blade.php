@php
    // "Check Request Status" and "Verify Certificate" are deliberately separate
    // entries: one tracks a submitted request by its reference ID, the other
    // verifies an issued certificate by its certificate number.
    $links = [
        ['route' => 'home', 'label' => 'Home'],
        ['route' => 'request.create', 'label' => 'Submit Request'],
        ['route' => 'status.index', 'label' => 'Check Request Status'],
        ['route' => 'verify.index', 'label' => 'Verify Certificate'],
    ];
@endphp

<header class="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
    <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
            <a href="{{ route('home') }}" class="flex items-center gap-2.5 text-ink">
                <span class="flex size-9 items-center justify-center rounded-control bg-brand-600 text-white">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                </span>
                <span class="flex flex-col leading-tight">
                    <span class="text-sm font-semibold tracking-tight">{{ config('certificate.app_name') }}</span>
                    <span class="hidden text-xs text-ink-muted sm:block">{{ config('certificate.tagline') }}</span>
                </span>
            </a>

            <nav aria-label="Main" class="hidden items-center gap-1 lg:flex">
                @foreach ($links as $link)
                    @php $active = request()->routeIs($link['route']) || request()->routeIs($link['route'] . '.*'); @endphp
                    <a href="{{ route($link['route']) }}"
                       @if ($active) aria-current="page" @endif
                       class="rounded-control px-3 py-2 text-sm font-medium transition-colors {{ $active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-muted hover:text-ink' }}">
                        {{ $link['label'] }}
                    </a>
                @endforeach
                <a href="{{ route('admin.login') }}"
                   class="ml-1 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
                    Admin sign in
                </a>
            </nav>

            <details class="lg:hidden">
                <summary class="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-control text-ink-soft hover:bg-surface-muted hover:text-ink">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                    <span class="sr-only">Menu</span>
                </summary>
                <nav aria-label="Main" class="absolute inset-x-0 border-b border-line bg-surface px-4 py-2 shadow-raised">
                    @foreach ($links as $link)
                        <a href="{{ route($link['route']) }}"
                           class="block rounded-control px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-muted hover:text-ink">
                            {{ $link['label'] }}
                        </a>
                    @endforeach
                    <a href="{{ route('admin.login') }}"
                       class="block rounded-control px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink">
                        Admin sign in
                    </a>
                </nav>
            </details>
        </div>
    </div>
</header>
