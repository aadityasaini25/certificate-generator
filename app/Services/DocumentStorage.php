<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Storage for applicant-uploaded documents.
 *
 * Three independent checks run before anything touches the disk: the declared
 * size, the file extension, and the file's leading magic bytes. The last one
 * matters most — a `.pdf` name and an `application/pdf` MIME header are both
 * attacker-controlled; the byte signature is not.
 *
 * Files live under the storage root in dated folders with generated UUID
 * names, and only the RELATIVE path is recorded in the database, so the
 * storage location can move without a schema change.
 */
class DocumentStorage
{
    public const KIND_PDF = 'pdf';
    public const KIND_ZIP = 'zip';

    /** Canonical MIME per kind, derived from content and not from headers. */
    private const CANONICAL_MIME = [
        self::KIND_PDF => 'application/pdf',
        self::KIND_ZIP => 'application/zip',
    ];

    /**
     * Identifies a file by its leading bytes.
     *
     * PDF: "%PDF-"
     * ZIP: "PK\x03\x04" (normal), "PK\x05\x06" (empty), "PK\x07\x08" (spanned)
     */
    public function detectKind(string $head): ?string
    {
        if (str_starts_with($head, '%PDF-')) {
            return self::KIND_PDF;
        }

        if (strlen($head) >= 4 && substr($head, 0, 2) === 'PK') {
            $sig = substr($head, 2, 2);
            if (in_array($sig, ["\x03\x04", "\x05\x06", "\x07\x08"], true)) {
                return self::KIND_ZIP;
            }
        }

        return null;
    }

    /** Strips directory components and control characters from a client name. */
    public function sanitiseName(string $name): string
    {
        $base = basename(str_replace('\\', '/', $name));
        $clean = preg_replace('/[\x00-\x1F\x7F]/u', '', trim($base)) ?? '';

        return mb_substr($clean, 0, 255) ?: 'document';
    }

    /**
     * Validates and stores an upload.
     *
     * @return array{ok: bool, error?: string, document?: array}
     */
    public function store(UploadedFile $file): array
    {
        $originalName = $this->sanitiseName($file->getClientOriginalName());
        $maxBytes = (int) config('certificate.uploads.max_bytes');
        $limitMb = (int) floor($maxBytes / (1024 * 1024));

        $extensions = config('certificate.uploads.extensions');
        $hasAccepted = false;
        foreach ($extensions as $ext) {
            if (Str::endsWith(Str::lower($originalName), '.' . $ext)) {
                $hasAccepted = true;
                break;
            }
        }
        if (! $hasAccepted) {
            return ['ok' => false, 'error' => 'Only PDF and ZIP files are accepted.'];
        }

        // The true byte length, not the client-reported size.
        $realPath = $file->getRealPath();
        $sizeBytes = $realPath !== false ? filesize($realPath) : 0;

        if ($sizeBytes <= 0) {
            return ['ok' => false, 'error' => 'The selected file is empty.'];
        }
        if ($sizeBytes > $maxBytes) {
            return [
                'ok' => false,
                'error' => "File is larger than {$limitMb}MB. Submit the form without an "
                    . 'attachment and we will contact you.',
            ];
        }

        $head = (string) file_get_contents($realPath, false, null, 0, 8);
        $kind = $this->detectKind($head);

        if ($kind === null) {
            return ['ok' => false, 'error' => 'That file is not a valid PDF or ZIP document.'];
        }

        // The extension must agree with the actual content, so a ZIP can never
        // be stored (and later served) under a .pdf name.
        if (! Str::endsWith(Str::lower($originalName), '.' . $kind)) {
            return [
                'ok' => false,
                'error' => 'File contents do not match its extension — expected a '
                    . strtoupper($kind) . ' file.',
            ];
        }

        // Written under a generated name; the client-supplied name is recorded
        // in the database for display but never used on disk.
        $relativeDir = 'uploads/' . now()->format('Y/m');
        $storedName = (string) Str::uuid() . '.' . $kind;
        $absoluteDir = $this->storageRoot() . '/' . $relativeDir;

        if (! is_dir($absoluteDir)) {
            mkdir($absoluteDir, 0750, true);
        }

        copy($realPath, $absoluteDir . '/' . $storedName);
        chmod($absoluteDir . '/' . $storedName, 0640);

        return [
            'ok' => true,
            'document' => [
                'originalName' => $originalName,
                'storedName' => $storedName,
                'storagePath' => $relativeDir . '/' . $storedName,
                'mimeType' => self::CANONICAL_MIME[$kind],
                'sizeBytes' => $sizeBytes,
            ],
        ];
    }

    /**
     * Root of the private file store.
     *
     * Kept identical to the previous implementation so the files already on
     * disk remain readable: <project>/storage/{uploads,certificates}.
     */
    public function storageRoot(): string
    {
        return rtrim(base_path('storage'), '/');
    }

    /**
     * Resolves a database-stored relative path to an absolute one.
     *
     * Refuses anything that escapes the storage root, so a crafted path in the
     * database can never be used to read arbitrary files off the server.
     */
    public function resolve(string $relativePath): string
    {
        $root = realpath($this->storageRoot());
        if ($root === false) {
            throw new \RuntimeException('Storage root does not exist.');
        }

        $candidate = $root . '/' . ltrim($relativePath, '/');
        $real = realpath($candidate);

        // realpath() returns false for a missing file; compare the normalised
        // candidate in that case so the traversal check still applies.
        $check = $real !== false ? $real : $this->normalise($candidate);

        if ($check !== $root && ! str_starts_with($check, $root . '/')) {
            throw new \RuntimeException("Refusing to resolve path outside the storage root: {$relativePath}");
        }

        return $check;
    }

    private function normalise(string $path): string
    {
        $parts = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                array_pop($parts);
                continue;
            }
            $parts[] = $segment;
        }

        return '/' . implode('/', $parts);
    }
}
