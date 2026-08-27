@extends('layouts.base')

@section('robots', 'noindex, nofollow')

@section('body')
    <main class="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 py-12">
        @yield('content')
    </main>
@endsection
