<?php

namespace App\Services;

use App\Models\Certificate;

/**
 * Certificate numbering.
 *
 * Development format: CERT-YYYY-NNNNNN, a six-digit sequence restarting each
 * calendar year. The format lives entirely in `format()`; if the client later
 * specifies a production format, only that method and `parse()` change.
 *
 * Uniqueness is guaranteed by the UNIQUE constraint on
 * certificates.certificateNo, not by this allocator. The allocator proposes a
 * number; the database is the authority, and the caller retries on collision.
 */
class CertificateNumberAllocator
{
    public const PREFIX = 'CERT';
    private const PADDING = 6;

    public function prefixFor(int $year): string
    {
        return self::PREFIX . '-' . $year . '-';
    }

    public function format(int $year, int $sequence): string
    {
        return $this->prefixFor($year) . str_pad((string) $sequence, self::PADDING, '0', STR_PAD_LEFT);
    }

    /** @return array{year:int,sequence:int}|null */
    public function parse(string $value): ?array
    {
        $pattern = '/^' . self::PREFIX . '-(\d{4})-(\d{' . self::PADDING . ',})$/';

        if (! preg_match($pattern, $value, $m)) {
            return null;
        }

        return ['year' => (int) $m[1], 'sequence' => (int) $m[2]];
    }

    /**
     * Proposes the next unused number for the given year.
     *
     * Uses the highest existing number rather than a row count, so deleting or
     * revoking a certificate can never cause a number to be handed out twice.
     */
    public function next(?\DateTimeInterface $issuedAt = null): string
    {
        $year = (int) ($issuedAt ?? now())->format('Y');
        $prefix = $this->prefixFor($year);

        $latest = Certificate::query()
            ->where('certificateNo', 'like', $prefix . '%')
            ->orderByDesc('certificateNo')
            ->value('certificateNo');

        $current = $latest !== null ? ($this->parse($latest)['sequence'] ?? 0) : 0;

        return $this->format($year, $current + 1);
    }
}
