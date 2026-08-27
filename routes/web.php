<?php

use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Route;

/*
|---------------------------------------------------------------------------
| Public routes
|---------------------------------------------------------------------------
| No authentication. Each publishes only explicitly whitelisted fields.
*/

// (public routes are added in later migration stages)

/*
|---------------------------------------------------------------------------
| Admin routes
|---------------------------------------------------------------------------
| `admin.login` is deliberately OUTSIDE the auth middleware group so it stays
| reachable while signed out and cannot cause a redirect loop.
*/

Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('login', [AuthController::class, 'showLogin'])->name('login');
        Route::post('login', [AuthController::class, 'login'])
            ->middleware('throttle:10,1')
            ->name('login.attempt');
    });

    Route::post('logout', [AuthController::class, 'logout'])
        ->middleware('auth:admin')
        ->name('logout');

    Route::middleware(['auth:admin', 'admin.active'])->group(function () {
        Route::get('/', function () {
            return view('admin.dashboard-placeholder');
        })->name('dashboard');
    });
});
