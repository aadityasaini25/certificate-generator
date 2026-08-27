<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\StatusController;
use App\Http\Controllers\Public\SubmissionController;
use App\Http\Controllers\Public\VerifyController;
use Illuminate\Support\Facades\Route;

/*
|---------------------------------------------------------------------------
| Public routes
|---------------------------------------------------------------------------
| No authentication. Each publishes only explicitly whitelisted fields.
|
| Request status tracking and certificate verification are deliberately
| separate features: one takes a reference ID (CRT-...), the other a
| certificate number (CERT-...). They share no lookup path.
*/

Route::get('/', HomeController::class)->name('home');

Route::get('request', [SubmissionController::class, 'create'])->name('request.create');
Route::post('request', [SubmissionController::class, 'store'])
    ->middleware('throttle:20,1')
    ->name('request.store');
Route::get('request/submitted', [SubmissionController::class, 'submitted'])->name('request.submitted');

Route::get('status', [StatusController::class, 'index'])->name('status.index');
Route::post('status', [StatusController::class, 'lookup'])
    ->middleware('throttle:60,1')
    ->name('status.lookup');
Route::get('status/{reference}', [StatusController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('status.show');

Route::get('verify', [VerifyController::class, 'index'])->name('verify.index');
Route::post('verify', [VerifyController::class, 'lookup'])
    ->middleware('throttle:60,1')
    ->name('verify.lookup');
Route::get('verify/{certificateNumber}', [VerifyController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('verify.show');

// Certificate numbers are sequential and therefore guessable, so the public
// PDF endpoint is throttled more tightly than the pages.
Route::get('verify/{certificateNumber}/pdf', [VerifyController::class, 'pdf'])
    ->middleware('throttle:30,1')
    ->name('verify.pdf');

Route::get('health', function () {
    try {
        \Illuminate\Support\Facades\DB::select('SELECT 1');

        return response()->json(['status' => 'ok', 'database' => 'connected']);
    } catch (\Throwable $e) {
        // Log the detail; never leak connection information to the caller.
        \Illuminate\Support\Facades\Log::error('[health] database check failed: ' . $e->getMessage());

        return response()->json(['status' => 'error', 'database' => 'unreachable'], 503);
    }
})->name('health');

/*
|---------------------------------------------------------------------------
| Admin routes
|---------------------------------------------------------------------------
| `admin.login` sits OUTSIDE the auth group so it stays reachable while
| signed out and cannot cause a redirect loop.
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
