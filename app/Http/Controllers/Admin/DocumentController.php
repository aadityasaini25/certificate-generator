<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UploadedDocument;
use App\Services\DocumentStorage;
use App\Support\Permission;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Secure access to applicant-uploaded documents.
 *
 * The browser supplies only a document id. The stored path is read from the
 * database and resolved through DocumentStorage, which refuses anything
 * outside the storage root — so a path can never be chosen by the caller and
 * traversal is impossible by construction.
 */
class DocumentController extends Controller
{
    /** Only formats the upload pipeline actually produces are ever served. */
    private const SERVABLE = ['application/pdf', 'application/zip'];

    /** PDFs may render in the browser; archives must always download. */
    private const INLINE = ['application/pdf'];

    public function __construct(private readonly DocumentStorage $storage)
    {
    }

    public function show(Request $request, string $id): Response
    {
        $this->authorize(Permission::SUBMISSION_READ);

        $document = UploadedDocument::find($id);

        if ($document === null || ! in_array($document->mimeType, self::SERVABLE, true)) {
            abort(404);
        }

        try {
            $absolute = $this->storage->resolve($document->storagePath);
        } catch (\Throwable) {
            abort(404);
        }

        if (! is_file($absolute)) {
            abort(404);
        }

        $wantsDownload = $request->query('download') === '1';
        $disposition = (! $wantsDownload && in_array($document->mimeType, self::INLINE, true))
            ? 'inline' : 'attachment';

        // Strip to ASCII so a crafted name cannot inject header syntax.
        $ascii = preg_replace('/[^\x20-\x7e]/', '_', $document->originalName);
        $ascii = str_replace(['"', '\\'], '_', (string) $ascii);

        return response()->file($absolute, [
            'Content-Type' => $document->mimeType,
            'Content-Disposition' => $disposition . '; filename="' . $ascii . '"; '
                . "filename*=UTF-8''" . rawurlencode($document->originalName),
            'X-Content-Type-Options' => 'nosniff',
            // An uploaded document is untrusted content.
            'Content-Security-Policy' => "default-src 'none'; sandbox; frame-ancestors 'self'",
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
}
