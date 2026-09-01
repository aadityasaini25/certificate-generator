<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerRateLimiters();
    }

    /**
     * Abuse protection for the public request form.
     *
     * The form is unauthenticated and accepts a file upload, and there is no
     * CAPTCHA in front of it, so the rate limiter is the only thing standing
     * between the endpoint and an automated flood.
     *
     * Two limits, because they catch different behaviour: the per-minute one
     * stops rapid-fire scripting, the per-hour one stops a slow drip that
     * would stay under a burst limit indefinitely. Both are keyed by IP.
     *
     * The hourly figure is deliberately not tighter than 10: several staff at
     * one company share a NAT address, and locking out a genuine applicant is
     * worse than accepting a small amount of noise.
     */
    private function registerRateLimiters(): void
    {
        RateLimiter::for('submissions', function (Request $request) {
            $key = $request->ip();

            return [
                Limit::perMinute(3)->by($key)->response(
                    fn () => $this->tooManyRequests()
                ),
                Limit::perHour(10)->by($key)->response(
                    fn () => $this->tooManyRequests()
                ),
            ];
        });
    }

    /**
     * A throttled applicant gets the form back with an explanation rather than
     * Laravel's bare "429 Too Many Requests" page.
     */
    private function tooManyRequests()
    {
        return back()
            ->withInput(request()->except('document'))
            ->withErrors([
                'form' => 'Too many requests have been sent from this network. '
                    .'Please wait a few minutes and try again.',
            ]);
    }
}
