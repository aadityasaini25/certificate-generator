/**
 * Configuration that is safe to read in the browser.
 *
 * Only NEXT_PUBLIC_* variables belong here — Next.js inlines them into the
 * client bundle at build time, so nothing secret may ever be added.
 * Server-only configuration lives in `src/lib/env.ts`, which is guarded by
 * `server-only`.
 */

import { DEFAULT_MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";

function publicInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const publicConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  /**
   * Organisation named in the privacy-consent sentence.
   *
   * Neutral by default. Set NEXT_PUBLIC_ORGANISATION_NAME once the client
   * confirms which brand name we are authorised to display.
   */
  organisationName:
    process.env.NEXT_PUBLIC_ORGANISATION_NAME?.trim() || "our organisation",

  /**
   * Target of the "Online Privacy Statement" link.
   *
   * Intentionally not invented. While unset the consent label still renders,
   * but the privacy statement shows as plain text instead of a dead link.
   */
  privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim() || "",

  /**
   * How much of the applicant's name the public status page reveals.
   *
   * Defaults to `masked` ("MAMTA S.") — enough for the applicant to recognise
   * their own request, without publishing a full name to anyone holding the
   * reference. Set to `full` only if the client decides that is acceptable, or
   * `hidden` to omit it entirely.
   */
  statusApplicantName: (() => {
    const value = process.env.NEXT_PUBLIC_STATUS_APPLICANT_NAME?.trim();
    return value === "full" || value === "hidden" ? value : "masked";
  })() as "masked" | "full" | "hidden",

  turnstile: {
    /** Public site key. Absent in local dev unless configured. */
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "",
  },

  maxUploadSizeBytes: publicInt(
    process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES,
    DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  ),
} as const;

export type PublicConfig = typeof publicConfig;
