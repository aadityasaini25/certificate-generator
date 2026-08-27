@extends('layouts.admin-auth')

@section('title', 'Admin sign in · ' . config('app.name'))

@section('content')
    <div class="w-full max-w-sm">
        <div class="mb-7 flex flex-col items-center text-center">
            <span class="flex size-12 items-center justify-center rounded-card bg-brand-600 text-white">
                <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                    <path d="m9 12 2 2 4-4"/>
                </svg>
            </span>
            <h1 class="mt-4 text-2xl font-semibold tracking-tight text-ink">
                {{ config('app.name') }} Admin
            </h1>
            <p class="mt-1.5 text-sm text-ink-muted">
                Sign in to review submissions and issue certificates.
            </p>
        </div>

        <x-ui.card>
            <x-ui.card-body class="sm:px-6">
                <form method="POST" action="{{ route('admin.login.attempt') }}" class="space-y-5" novalidate>
                    @csrf
                    @if ($next)
                        <input type="hidden" name="next" value="{{ $next }}">
                    @endif

                    @if ($errors->any())
                        <div role="alert"
                             class="flex items-start gap-2.5 rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3 text-sm text-status-danger">
                            <svg class="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                            </svg>
                            <span>{{ $errors->first() }}</span>
                        </div>
                    @endif

                    <x-ui.field name="email" label="Email" type="email" required
                                autocomplete="username" inputmode="email" autofocus />

                    <x-ui.field name="password" label="Password" type="password" required
                                autocomplete="current-password" />

                    <x-ui.button type="submit" size="lg" class="w-full">Sign In</x-ui.button>
                </form>
            </x-ui.card-body>
        </x-ui.card>

        <p class="mt-6 text-center text-xs text-ink-muted">
            Authorised personnel only. Access is logged.
        </p>
    </div>
@endsection
