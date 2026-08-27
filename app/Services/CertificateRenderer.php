<?php

namespace App\Services;

use Mpdf\Mpdf;

/**
 * Renders a frozen snapshot to a PDF.
 *
 * mPDF turns a Blade view into the document, so the certificate design lives
 * in a template that can be restyled without touching generation logic. The
 * template receives only the snapshot and the QR image — never the database,
 * the filesystem or the environment — which is what makes re-rendering an old
 * certificate reproduce the original.
 */
class CertificateRenderer
{
    /** Templates registered by key, matching Certificate.templateKey. */
    private const TEMPLATES = [
        'default' => 'certificates.default',
    ];

    public function __construct(private readonly CertificateQrGenerator $qr)
    {
    }

    public function supports(string $templateKey): bool
    {
        return isset(self::TEMPLATES[$templateKey]);
    }

    /**
     * @param  array  $snapshot  The frozen certificate snapshot.
     * @return string Raw PDF bytes.
     */
    public function render(array $snapshot): string
    {
        $templateKey = $snapshot['templateKey'] ?? 'default';

        if (! $this->supports($templateKey)) {
            // Never silently substitute a design.
            throw new \RuntimeException(
                "Unknown certificate template \"{$templateKey}\"."
            );
        }

        $verificationUrl = $this->qr->verificationUrl($snapshot['certificateNo']);

        $html = view(self::TEMPLATES[$templateKey], [
            'snapshot' => $snapshot,
            'qrDataUri' => $this->qr->dataUri($verificationUrl),
            'issueDate' => $this->formatIssueDate($snapshot['issuedAt'] ?? null),
        ])->render();

        $mpdf = new Mpdf([
            'format' => 'A4-L',
            'margin_left' => 28,
            'margin_right' => 28,
            'margin_top' => 28,
            'margin_bottom' => 28,
            // mPDF needs a writable scratch directory; keep it inside Laravel's
            // storage so shared hosting does not need /tmp access.
            'tempDir' => storage_path('framework/cache/mpdf'),
        ]);

        // Nothing about the server or the database belongs in file metadata.
        $mpdf->SetTitle('Certificate ' . $snapshot['certificateNo']);
        $mpdf->SetAuthor($snapshot['organisation']['name'] ?? '');
        $mpdf->SetCreator($snapshot['organisation']['name'] ?? '');
        $mpdf->SetSubject('Certificate of Submission');

        // Without a configured organisation this is not a real certificate,
        // and it must be impossible to mistake one for the real thing. mPDF's
        // native watermark is used because CSS rotation and opacity are not
        // supported, and a solid overlay would obscure the data.
        if (! empty($snapshot['organisation']['isPlaceholder'])) {
            $mpdf->SetWatermarkText('ORGANISATION NOT CONFIGURED');
            $mpdf->showWatermarkText = true;
            $mpdf->watermarkTextAlpha = 0.08;
        }

        $mpdf->WriteHTML($html);

        return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
    }

    private function formatIssueDate(?string $iso): string
    {
        if (! $iso) {
            return '—';
        }

        try {
            return \Carbon\Carbon::parse($iso)->utc()->format('d F Y');
        } catch (\Throwable) {
            return '—';
        }
    }
}
