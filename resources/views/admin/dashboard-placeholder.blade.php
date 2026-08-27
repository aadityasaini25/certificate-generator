@extends('layouts.base')
@section('title', 'Dashboard')
@section('robots', 'noindex, nofollow')
@section('body')
    <main class="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 class="text-2xl font-semibold text-ink">Admin Dashboard</h1>
        <p class="mt-2 text-sm text-ink-soft">
            Signed in as {{ auth('admin')->user()->email }}
            ({{ auth('admin')->user()->role->label() }}).
        </p>
        <form method="POST" action="{{ route('admin.logout') }}" class="mt-6">
            @csrf
            <x-ui.button type="submit" variant="secondary">Sign out</x-ui.button>
        </form>
    </main>
@endsection
