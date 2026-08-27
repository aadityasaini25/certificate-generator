<?php

namespace App\Services;

/**
 * Human-facing tracking numbers, e.g. CRT-2026-7K4M2Q.
 *
 * Random rather than sequential: a counter would need a lock to stay race-free
 * under concurrent submissions, and would leak how many requests the business
 * receives. Uniqueness is guaranteed by the UNIQUE constraint on
 * certificate_submissions.referenceNo — the caller retries on collision.
 */
class ReferenceNumberGenerator
{
    /** Excludes I, O, 0 and 1 so a code is unambiguous when read aloud. */
    private const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    private const CODE_LENGTH = 6;

    public function generate(?\DateTimeInterface $at = null): string
    {
        $year = ($at ?? now())->format('Y');

        $code = '';
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return "CRT-{$year}-{$code}";
    }
}
