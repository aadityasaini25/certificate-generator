import { z } from "zod";

/**
 * Public reference-ID validation.
 *
 * Mirrors the certificate-number validator: it constrains the character set and
 * length rather than hard-coding the CRT-YYYY-XXXXXX shape, so the reference
 * format in `src/lib/submissions/reference.ts` can change without breaking
 * public lookup.
 */

export const MAX_REFERENCE_LENGTH = 64;

/** Letters, digits and hyphens only — no path separators, no LIKE wildcards. */
const ALLOWED_PATTERN = /^[A-Z0-9-]+$/;

/** Trim, remove inner whitespace, uppercase. */
export function normaliseReference(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export const referenceSchema = z
  .string()
  .trim()
  .min(1, "Enter your reference ID.")
  .max(
    MAX_REFERENCE_LENGTH,
    `Reference IDs are at most ${MAX_REFERENCE_LENGTH} characters.`,
  )
  .transform(normaliseReference)
  .refine((value) => value.length > 0, "Enter your reference ID.")
  .refine(
    (value) => ALLOWED_PATTERN.test(value),
    "A reference ID contains only letters, numbers and hyphens.",
  );

export type ReferenceValue = z.infer<typeof referenceSchema>;

/**
 * One message for every unsuccessful lookup.
 *
 * Malformed and unknown references produce identical output, so a caller
 * cannot use the response to discover which references exist.
 */
export const REQUEST_NOT_FOUND_MESSAGE =
  "We couldn't find a request matching this reference ID. " +
  "Please check the reference ID and try again.";
