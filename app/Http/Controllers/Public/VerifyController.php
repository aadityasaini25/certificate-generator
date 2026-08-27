<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\CertificateVerifier;
use App\Services\DocumentStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public certificate verification.
 *
 * No authentication. The caller supplies a certificate number, never a path:
 * the stored path is read from the database and resolved through
 * DocumentStorage, which refuses anything outside the storage root.
 */
class VerifyController extends Controller
{
    /**
     * Deliberately does NOT hard-code the CERT-YYYY-NNNNNN shape, so the
     * numbering format can change without breaking public lookup.
     */
    public const PATTERN = '/^[A-Z0-9-]{1,64}$/';

    public function __construct(
        private readonly CertificateVerifier $verifier,
        private readonly DocumentStorage $storage,
    ) {
    }

    public function index(): View
    {
        return view('public.verify');
    }

    public function lookup(Request $request): RedirectResponse
    {
        $number = $this->normalise((string) $request->input('certificateNumber'));

        if ($number === '' || ! preg_match(self::PATTERN, $number)) {
            return back()->withErrors([
                'certificateNumber' => 'A certificate number contains only letters, numbers and hyphens.',
            ])->withInput();
        }

        return redirect()->route('verify.show', $number);
    }

    public function show(string $certificateNumber): View
    {
        $number = $this->normalise($certificateNumber);

        $result = preg_match(self::PATTERN, $number)
            ? $this->verifier->verify($number)
            : ['outcome' => CertificateVerifier::NOT_FOUND];

        return match ($result['outcome']) {
            CertificateVerifier::VERIFIED => view('public.verify-result', ['certificate' => $result['certificate']]),
            CertificateVerifier::NOT_CURRENTLY_VALID => view('public.verify-withdrawn', ['certificate' => $result['certificate']]),
            default => view('public.verify-not-found'),
        };
    }

    /**
     * Serves the stored certificate PDF.
     *
     * Nothing is rendered here — a certificate the public downloads is
     * byte-for-byte the document that was generated and stored.
     */
    public function pdf(Request $request, string $certificateNumber): Response
    {
        $number = $this->normalise($certificateNumber);

        if (! preg_match(self::PATTERN, $number)) {
            abort(404);
        }

        $certificate = $this->verifier->publicFile($number);
        if ($certificate === null) {
            abort(404);
        }

        try {
            $absolute = $this->storage->resolve($certificate->filePath);
        } catch (\Throwable $e) {
            abort(404);
        }

        if (! is_file($absolute)) {
            abort(404);
        }

        // Plain strings rather than framework constants: Symfony moved these
        // between classes, and the header values themselves are stable.
        $disposition = $request->query('download') === '1' ? 'attachment' : 'inline';

        return response()->file($absolute, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition . '; filename="' . $certificate->certificateNo . '.pdf"',
            // Never let a browser second-guess the type we declared.
            'X-Content-Type-Options' => 'nosniff',
            // An uploaded/issued document is untrusted content to the browser.
            'Content-Security-Policy' => "default-src 'none'; sandbox; frame-ancestors 'self'",
            // An issued certificate is immutable, so it is cacheable — but only
            // by the requesting browser, never by a shared proxy.
            'Cache-Control' => 'private, max-age=300',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }

    private function normalise(string $raw): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($raw)) ?? '');
    }
}
