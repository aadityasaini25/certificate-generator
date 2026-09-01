<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CertificateController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DocumentController;
use App\Http\Controllers\Admin\SubmissionActionController;
use App\Http\Controllers\Admin\SubmissionController as AdminSubmissionController;
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

// There is no CAPTCHA in front of this endpoint, so the named `submissions`
// limiter (3/minute and 10/hour per IP, defined in AppServiceProvider) is the
// only abuse protection on a public form that accepts file uploads. The old
// throttle:20,1 allowed 1200 uploads an hour from one address.
Route::post('request', [SubmissionController::class, 'store'])
    ->middleware('throttle:submissions')
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
        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('submissions', [AdminSubmissionController::class, 'index'])->name('submissions.index');
        Route::get('submissions/{id}', [AdminSubmissionController::class, 'show'])->name('submissions.show');
        Route::get('submissions/{id}/edit', [AdminSubmissionController::class, 'edit'])->name('submissions.edit');
        Route::put('submissions/{id}', [AdminSubmissionController::class, 'update'])->name('submissions.update');

        Route::post('submissions/{id}/status', [SubmissionActionController::class, 'changeStatus'])->name('submissions.status');
        Route::post('submissions/{id}/remark', [SubmissionActionController::class, 'addRemark'])->name('submissions.remark');
        Route::post('submissions/{id}/recover', [SubmissionActionController::class, 'recover'])->name('submissions.recover');
        Route::post('submissions/{id}/certificate', [CertificateController::class, 'generate'])->name('submissions.certificate');

        // Documents and certificates are addressed by id; the stored path is
        // read from the database and never taken from the request.
        Route::get('documents/{id}', [DocumentController::class, 'show'])->name('documents.show');
        Route::get('certificates/{id}', [CertificateController::class, 'show'])->name('certificates.show');
    });
});
