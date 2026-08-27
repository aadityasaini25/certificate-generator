<?php

namespace App\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;

/**
 * Certificate QR codes.
 *
 * The QR encodes one thing: the public verification URL. Nothing about the
 * applicant, the database or the filesystem goes into it — the certificate
 * number identifies the certificate, and the verification page decides what
 * is safe to publish.
 *
 * Nothing is stored: a QR is deterministically reproducible from the
 * configured base URL plus the certificate number, so there is no QR table,
 * no QR column and no image kept on disk.
 */
class CertificateQrGenerator
{
    /**
     * The verification URL for a certificate.
     *
     * APP_URL is the single source of the domain — no host is hard-coded.
     * In development it is http://127.0.0.1:8000, which is correct but cannot
     * be scanned from a phone (localhost means the phone itself).
     */
    public function verificationUrl(string $certificateNumber): string
    {
        return rtrim((string) config('app.url'), '/') . '/verify/' . rawurlencode($certificateNumber);
    }

    /**
     * Renders the QR as a data URI, ready to embed in the PDF's HTML.
     *
     * Settings chosen for a document that will be printed and photocopied:
     * error correction Q recovers ~25% of the symbol, the quiet zone is the
     * margin the QR specification requires, and it is rendered far larger
     * than it is placed so the PDF embeds a high-resolution image.
     */
    public function dataUri(string $url): string
    {
        $result = (new Builder(
            writer: new PngWriter(),
            data: $url,
            errorCorrectionLevel: ErrorCorrectionLevel::Quartile,
            size: 600,
            margin: 16,
        ))->build();

        return $result->getDataUri();
    }
}
