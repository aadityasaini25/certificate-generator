<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubmissionRequest;
use App\Services\DocumentStorage;
use App\Services\SubmissionCreator;
use App\Services\TurnstileVerifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;

/**
 * The public certificate request form.
 *
 * Nothing that arrives over the wire is trusted: the CAPTCHA is verified and
 * the upload is inspected before anything is written.
 */
class SubmissionController extends Controller
{
    public function __construct(
        private readonly TurnstileVerifier $turnstile,
        private readonly DocumentStorage $storage,
        private readonly SubmissionCreator $creator,
    ) {
    }

    public function create(): View
    {
        return view('public.request', [
            'locations' => config('certificate.locations'),
            'turnstileSiteKey' => config('certificate.turnstile.site_key'),
        ]);
    }

    public function store(StoreSubmissionRequest $request): RedirectResponse
    {
        // 1. CAPTCHA, before any file handling.
        $captcha = $this->turnstile->verify(
            $request->input('cf-turnstile-response'),
            $request->ip()
        );

        if (! $captcha['success']) {
            return back()
                ->withInput($request->except('document'))
                ->withErrors(['captcha' => $captcha['reason']]);
        }

        // 2. The document: size, extension and magic bytes.
        $stored = $this->storage->store($request->file('document'));

        if (! $stored['ok']) {
            return back()
                ->withInput($request->except('document'))
                ->withErrors(['document' => $stored['error']]);
        }

        // 3. Persist.
        try {
            $submission = $this->creator->create(
                $request->validated(),
                $stored['document'],
                $request->ip(),
            );
        } catch (\Throwable $e) {
            // Log the detail server-side; the applicant gets nothing about
            // the database.
            Log::error('[submissions] failed to persist submission: ' . $e->getMessage());

            return back()
                ->withInput($request->except('document'))
                ->withErrors(['form' => 'We could not save your request. Please try again shortly.']);
        }

        // Redirect-after-POST, so a refresh cannot resubmit. The reference is
        // flashed rather than put in the URL.
        return redirect()
            ->route('request.submitted')
            ->with('referenceNo', $submission->referenceNo);
    }

    public function submitted(Request $request): RedirectResponse|View
    {
        $referenceNo = $request->session()->get('referenceNo');

        // Nothing to show on a direct visit.
        if (! $referenceNo) {
            return redirect()->route('request.create');
        }

        return view('public.request-submitted', ['referenceNo' => $referenceNo]);
    }
}
