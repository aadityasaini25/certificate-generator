<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\RequestStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Public request status tracking.
 *
 * A GET on its own URL so an applicant can bookmark or revisit the result.
 * The page is noindex and sends no referrer, so a reference ID is not handed
 * to search engines or to any site linked from it.
 */
class StatusController extends Controller
{
    /**
     * Reference IDs contain only letters, digits and hyphens — no path
     * separators and no LIKE metacharacters.
     */
    public const PATTERN = '/^[A-Z0-9-]{1,64}$/';

    public function __construct(private readonly RequestStatusService $service)
    {
    }

    public function index(Request $request): View
    {
        return view('public.status', [
            // Supports /status?reference=... so a link can prefill the field.
            'reference' => (string) $request->query('reference', ''),
        ]);
    }

    /** The form posts here and redirects, so the result gets its own URL. */
    public function lookup(Request $request): RedirectResponse
    {
        $reference = $this->normalise((string) $request->input('reference'));

        if ($reference === '' || ! preg_match(self::PATTERN, $reference)) {
            return back()->withErrors([
                'reference' => 'A reference ID contains only letters, numbers and hyphens.',
            ])->withInput();
        }

        return redirect()->route('status.show', $reference);
    }

    public function show(string $reference): View
    {
        $normalised = $this->normalise($reference);

        // A malformed reference and an unknown one render identically, so the
        // response cannot be used to discover which references exist.
        $result = preg_match(self::PATTERN, $normalised)
            ? $this->service->lookup($normalised)
            : null;

        if ($result === null) {
            return view('public.status-not-found');
        }

        return view('public.status-result', ['request' => $result]);
    }

    private function normalise(string $raw): string
    {
        return strtoupper(preg_replace('/\s+/', '', trim($raw)) ?? '');
    }
}
