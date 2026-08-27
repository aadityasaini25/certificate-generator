<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

/**
 * Administrator sign-in and sign-out.
 *
 * Laravel's session guard replaces the hand-rolled session table from the
 * Next.js implementation. Sessions are server-side (file driver), the cookie
 * is HttpOnly and SameSite=Lax, and `session()->regenerate()` on login
 * prevents session fixation.
 */
class AuthController extends Controller
{
    /**
     * The single message shown for every credential failure.
     *
     * Wrong password and unknown email produce this exact text, so a response
     * never reveals whether an account exists.
     */
    private const GENERIC_ERROR = 'Invalid email or password.';

    private const INACTIVE_ERROR =
        'This account has been deactivated. Please contact your administrator.';

    public function showLogin(Request $request): View|RedirectResponse
    {
        // An already-authenticated admin has no reason to see this page.
        if (Auth::guard('admin')->check()) {
            return redirect()->route('admin.dashboard');
        }

        return view('admin.auth.login', [
            'next' => $this->safeRedirectTarget($request->query('next')),
        ]);
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $credentials = $request->validated();
        $email = strtolower(trim($credentials['email']));

        $admin = Admin::where('email', $email)->first();

        // Unknown email: still run a bcrypt comparison so the response takes
        // the same time as a wrong password for a real account. Without this,
        // timing would reveal which addresses are registered.
        if ($admin === null) {
            Hash::check($credentials['password'], self::decoyHash());

            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => self::GENERIC_ERROR]);
        }

        if (! Hash::check($credentials['password'], $admin->passwordHash)) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => self::GENERIC_ERROR]);
        }

        // Reached only with correct credentials, so naming the reason here
        // discloses nothing the caller did not already know.
        if (! $admin->isActive) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => self::INACTIVE_ERROR]);
        }

        Auth::guard('admin')->login($admin, remember: false);

        // New session id, so a token captured before login cannot be reused.
        $request->session()->regenerate();

        $admin->forceFill(['lastLoginAt' => now()])->save();

        return redirect()->intended(
            $this->safeRedirectTarget($request->input('next')) ?? route('admin.dashboard')
        );
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();

        // Destroy the session server-side, not just the cookie, so the old
        // session id cannot be replayed.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }

    /**
     * Only same-site admin paths are accepted as a post-login destination, so
     * a crafted `?next=` cannot turn the login page into an open redirect.
     */
    private function safeRedirectTarget(?string $candidate): ?string
    {
        if (! is_string($candidate) || $candidate === '') {
            return null;
        }
        if (str_starts_with($candidate, '//')) {
            return null;
        }
        if (! preg_match('#^/admin(?:/|$)#', $candidate)) {
            return null;
        }
        if ($candidate === '/admin/login') {
            return null;
        }

        return $candidate;
    }

    /**
     * A hash of an unguessable value. Not a credential: no password produces
     * it. It exists only to equalise timing for unknown accounts.
     */
    private static function decoyHash(): string
    {
        return '$2y$12$KIlOA1Peogu1XRivP1cRWuPNC9dnd7jo3DNtsppZrwG0aqqnb6Gku';
    }
}
