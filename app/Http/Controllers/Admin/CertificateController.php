<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\CertificateSubmission;
use App\Services\CertificateIssuer;
use App\Services\DocumentStorage;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Certificate generation and admin-side viewing.
 */
class CertificateController extends Controller
{
    public function __construct(
        private readonly CertificateIssuer $issuer,
        private readonly DocumentStorage $storage,
    ) {
    }

    public function generate(Request $request, string $id): RedirectResponse
    {
        $this->authorize(Permission::CERTIFICATE_GENERATE);

        $submission = CertificateSubmission::findOrFail($id);
        $result = $this->issuer->issue($submission, $request->user('admin'));

        if (! $result['ok']) {
            return back()->withErrors(['certificate' => $result['message']]);
        }

        return back()->with('status', "Certificate {$result['certificate']->certificateNo} issued.");
    }

    /** Serves an issued certificate to an administrator. */
    public function show(Request $request, string $id): Response
    {
        // Reading an issued certificate needs only read access; creating one
        // needs certificate:generate.
        $this->authorize(Permission::SUBMISSION_READ);

        $certificate = Certificate::findOrFail($id);

        if ($certificate->filePath === null) {
            abort(404);
        }

        try {
            $absolute = $this->storage->resolve($certificate->filePath);
        } catch (\Throwable) {
            abort(404);
        }

        if (! is_file($absolute)) {
            abort(404);
        }

        $disposition = $request->query('download') === '1' ? 'attachment' : 'inline';

        return response()->file($absolute, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition . '; filename="' . $certificate->certificateNo . '.pdf"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox; frame-ancestors 'self'",
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
