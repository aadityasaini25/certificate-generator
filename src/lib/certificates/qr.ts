import "server-only";

import QRCode from "qrcode";

import { env } from "@/lib/env";

/**
 * Certificate QR codes.
 *
 * The QR encodes one thing: the public verification URL for the certificate.
 * Nothing about the applicant, the database or the filesystem goes into it —
 * the certificate number already identifies the certificate, and the existing
 * Phase 6 verification page decides what is safe to publish.
 *
 * Nothing is stored: a QR is deterministically reproducible from the
 * configured base URL plus the certificate number, so there is no QR table, no
 * QR column, and no image kept on disk.
 */

/** Path segment of the existing public verification route. */
const VERIFY_PATH = "/verify";

/**
 * Builds the verification URL from an explicit base.
 *
 * Pure, so it can be tested without environment setup and so the base URL is
 * always visibly a caller's decision rather than an ambient one.
 */
export function verificationUrlFrom(
  baseUrl: string,
  certificateNumber: string,
): string {
  // `new URL` normalises away a trailing slash on the base and handles the
  // join correctly whether or not one is present.
  return new URL(
    `${VERIFY_PATH}/${encodeURIComponent(certificateNumber)}`,
    baseUrl,
  ).toString();
}

/**
 * The verification URL for a certificate, using the configured public origin.
 *
 * NEXT_PUBLIC_APP_URL is the single source of the domain. In development it is
 * http://localhost:3000, which is expected — see the README for why a phone
 * cannot scan a localhost QR. Production must set it to the real domain; no
 * host is hard-coded anywhere in the QR path.
 */
export function certificateVerificationUrl(certificateNumber: string): string {
  return verificationUrlFrom(env.appUrl, certificateNumber);
}

/**
 * QR settings, chosen for a document that will be printed and possibly
 * photocopied.
 *
 * - Error correction Q recovers ~25% of the symbol, so a smudge, a staple hole
 *   or a poor scan does not destroy it. The payload is a short URL, so the
 *   extra redundancy costs only a few modules.
 * - `margin: 4` is the quiet zone the QR specification requires; without it
 *   many scanners fail against a busy background.
 * - Rendered far larger than it is placed, so the PDF embeds a high-resolution
 *   image rather than an upscaled one.
 */
const QR_OPTIONS = {
  errorCorrectionLevel: "Q",
  type: "png",
  /** Pixels. Placed at ~92pt in the PDF, giving roughly 470 DPI. */
  width: 600,
  /** Quiet zone, in modules. */
  margin: 4,
  color: { dark: "#000000ff", light: "#ffffffff" },
} as const;

/** Renders a QR PNG for an already-built URL. */
export function renderQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, QR_OPTIONS);
}
