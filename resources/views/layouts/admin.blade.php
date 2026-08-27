@extends('layouts.base')
@section('robots', 'noindex, nofollow')

@section('body')
@php $admin = auth('admin')->user(); @endphp
<div class="flex min-h-svh flex-col bg-canvas">
    <header class="sticky top-0 z-40 border-b border-line bg-surface">
        <div class="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div class="flex items-center gap-2.5">
                <span class="flex size-9 items-center justify-center rounded-control bg-brand-600 text-white">
                    <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>
                    </svg>
                </span>
                <div class="leading-tight">
                    <p class="text-sm font-semibold text-ink">{{ config('certificate.app_name') }}</p>
                    <p class="text-xs text-ink-muted">Admin panel</p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <div class="hidden text-right leading-tight sm:block">
                    <p class="text-sm font-medium text-ink">{{ $admin->name }}</p>
                    <p class="text-xs text-ink-muted">{{ $admin->role->label() }}</p>
                </div>
                {{-- A form post, so signing out cannot be triggered by a GET. --}}
                <form method="POST" action="{{ route('admin.logout') }}">
                    @csrf
                    <button type="submit"
                            class="inline-flex items-center gap-1.5 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    </header>

    <div class="flex flex-1 flex-col lg:flex-row">
        <aside class="border-b border-line bg-surface px-4 py-4 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-6">
            <nav aria-label="Admin" class="space-y-1">
                @php
                    // Links are filtered by permission, so one an admin cannot
                    // use is never rendered.
                    $items = [
                        ['route' => 'admin.dashboard', 'label' => 'Dashboard', 'permission' => null],
                        ['route' => 'admin.submissions.index', 'label' => 'Submissions', 'permission' => \App\Support\Permission::SUBMISSION_READ],
                    ];
                @endphp
                @foreach ($items as $item)
                    @if (! $item['permission'] || $admin->can($item['permission']))
                        @php $active = request()->routeIs($item['route']) || request()->routeIs(str_replace('.index', '.*', $item['route'])); @endphp
                        <a href="{{ route($item['route']) }}"
                           @if ($active) aria-current="page" @endif
                           class="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors {{ $active ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-muted hover:text-ink' }}">
                            {{ $item['label'] }}
                        </a>
                    @endif
                @endforeach
            </nav>
        </aside>

        <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            @if (session('status'))
                <div role="status"
                     class="mb-5 rounded-control border border-status-success bg-status-success-bg px-3.5 py-3 text-sm text-status-success">
                    {{ session('status') }}
                </div>
            @endif
            @if ($errors->any())
                <div role="alert"
                     class="mb-5 rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3 text-sm text-status-danger">
                    {{ $errors->first() }}
                </div>
            @endif

            @yield('content')
        </main>
    </div>
</div>
@endsection
