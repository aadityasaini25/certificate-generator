<!DOCTYPE html>
<html lang="en" class="h-full antialiased">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', config('app.name'))</title>
    @hasSection('robots')
        <meta name="robots" content="@yield('robots')">
    @endif
    @hasSection('referrer')
        <meta name="referrer" content="@yield('referrer')">
    @endif
    @vite(['resources/css/app.css'])
</head>
<body class="flex min-h-full flex-col">
    @yield('body')
</body>
</html>
