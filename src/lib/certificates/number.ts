import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Certificate numbering.
 *
 * Development format: CERT-YYYY-NNNNNN, e.g. CERT-2026-000001 — a six-digit
 * sequence that restarts each calendar year.
 *
 * The format lives entirely in `formatCertificateNumber`. If the client later
 * specifies an exact production format, only that function and the parser
 * beside it change; nothing in the generation service, the database or the
 * templates assumes a particular shape.
 *
 * Uniqueness is guaranteed by the UNIQUE constraint on `certificates.certificateNo`,
 * not by this allocator. The allocator proposes a number; the database is the
 * authority, and the caller retries if it loses a race.
 */

export const CERTIFICATE_NUMBER_PREFIX = "CERT";
const SEQUENCE_PADDING = 6;

export function certificateNumberPrefixFor(year: number): string {
  return `${CERTIFICATE_NUMBER_PREFIX}-${year}-`;
}

export function formatCertificateNumber(year: number, sequence: number): string {
  return `${certificateNumberPrefixFor(year)}${String(sequence).padStart(
    SEQUENCE_PADDING,
    "0",
  )}`;
}

/** Reads the sequence back out of a number, or null if it does not match. */
export function parseCertificateNumber(
  value: string,
): { year: number; sequence: number } | null {
  const match = new RegExp(
    `^${CERTIFICATE_NUMBER_PREFIX}-(\\d{4})-(\\d{${SEQUENCE_PADDING},})$`,
  ).exec(value);

  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/**
 * Proposes the next unused number for the given year.
 *
 * Uses the highest existing number rather than a row count, so deleting or
 * revoking a certificate can never cause a number to be handed out twice.
 * Runs inside the caller's transaction when one is supplied.
 */
export async function nextCertificateNumber(
  client: Prisma.TransactionClient,
  issuedAt: Date = new Date(),
): Promise<string> {
  const year = issuedAt.getUTCFullYear();
  const prefix = certificateNumberPrefixFor(year);

  const latest = await client.certificate.findFirst({
    where: { certificateNo: { startsWith: prefix } },
    orderBy: { certificateNo: "desc" },
    select: { certificateNo: true },
  });

  const currentSequence = latest
    ? (parseCertificateNumber(latest.certificateNo)?.sequence ?? 0)
    : 0;

  return formatCertificateNumber(year, currentSequence + 1);
}
