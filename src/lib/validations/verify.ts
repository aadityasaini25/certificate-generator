import { z } from "zod";

/**
 * Public certificate-number validation.
 *
 * Deliberately does NOT hard-code the CERT-YYYY-NNNNNN shape. Phase 5 keeps the
 * numbering format modular, so this only constrains the character set and
 * length — enough to keep junk away from the database without breaking if the
 * client later specifies a different format.
 */

/** Upper bound on input, so a huge string never reaches the database. */
export const MAX_CERTIFICATE_NUMBER_LENGTH = 64;

/**
 * Letters, digits and hyphens only.
 *
 * Excluding everything else means a certificate number can never carry a path
 * separator, a wildcard, or SQL/LIKE metacharacters.
 */
const ALLOWED_PATTERN = /^[A-Z0-9-]+$/;

/** Normalises user input: trim, collapse inner whitespace, uppercase. */
export function normaliseCertificateNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export const certificateNumberSchema = z
  .string()
  .trim()
  .min(1, "Enter a certificate number.")
  .max(
    MAX_CERTIFICATE_NUMBER_LENGTH,
    `Certificate numbers are at most ${MAX_CERTIFICATE_NUMBER_LENGTH} characters.`,
  )
  .transform(normaliseCertificateNumber)
  .refine(
    (value) => value.length > 0,
    "Enter a certificate number.",
  )
  .refine(
    (value) => ALLOWED_PATTERN.test(value),
    "A certificate number contains only letters, numbers and hyphens.",
  );

export const verifyFormSchema = z.object({
  certificateNumber: certificateNumberSchema,
});

export type VerifyFormValues = z.infer<typeof verifyFormSchema>;

/**
 * The single message shown whenever verification does not succeed.
 *
 * Identical for "no such number", "malformed", and "revoked lookup miss", so a
 * caller cannot use the response to probe which numbers exist.
 */
export const CERTIFICATE_NOT_FOUND_MESSAGE =
  "The certificate number you entered could not be verified. " +
  "Please check the certificate number and try again.";
