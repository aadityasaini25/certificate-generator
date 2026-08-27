<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cloudflare Turnstile verification.
 *
 * The browser widget produces a single-use token; only this server-side call
 * decides whether it is valid. A token is never trusted because the client
 * says so, and every failure path returns false — including network errors.
 */
class TurnstileVerifier
{
    public function isConfigured(): bool
    {
        return config('certificate.turnstile.site_key') !== ''
            && config('certificate.turnstile.secret_key') !== '';
    }

    /** True when running against Cloudflare's fixed-verdict testing keys. */
    public function isTestMode(): bool
    {
        return in_array(
            config('certificate.turnstile.secret_key'),
            config('certificate.turnstile.test_secrets'),
            true
        );
    }

    /**
     * @return array{success: bool, reason: string}
     */
    public function verify(?string $token, ?string $remoteIp = null): array
    {
        $secret = (string) config('certificate.turnstile.secret_key');

        // In production a misconfigured CAPTCHA must reject every submission
        // rather than wave them all through.
        if (app()->environment('production') && (! $this->isConfigured() || $this->isTestMode())) {
            Log::error('[captcha] refusing submissions: CAPTCHA missing or using test keys in production.');

            return ['success' => false, 'reason' => 'CAPTCHA is not correctly configured.'];
        }

        if (! $this->isConfigured()) {
            Log::warning('[captcha] Turnstile is not configured — skipping verification (development only).');

            return ['success' => true, 'reason' => ''];
        }

        if ($token === null || trim($token) === '') {
            return ['success' => false, 'reason' => 'Please complete the verification challenge.'];
        }

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->post(config('certificate.turnstile.verify_url'), array_filter([
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $remoteIp,
                ]));
        } catch (\Throwable $e) {
            // Network failure or timeout: fail closed rather than letting an
            // unverified submission through.
            Log::error('[captcha] siteverify request failed: ' . $e->getMessage());

            return ['success' => false, 'reason' => 'Could not reach the verification service. Please try again.'];
        }

        if (! $response->successful()) {
            Log::error('[captcha] siteverify returned HTTP ' . $response->status());

            return ['success' => false, 'reason' => 'Verification service error. Please try again.'];
        }

        if (! ($response->json('success') === true)) {
            // Error codes are diagnostic only; the visitor gets a generic message.
            Log::warning('[captcha] verification rejected', ['codes' => $response->json('error-codes')]);

            return ['success' => false, 'reason' => 'Verification failed. Please try again.'];
        }

        return ['success' => true, 'reason' => ''];
    }
}
