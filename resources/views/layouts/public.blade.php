@extends('layouts.base')

@section('body')
    @include('partials.site-header')

    <main class="flex-1">
        @yield('content')
    </main>

    @include('partials.site-footer')
@endsection
