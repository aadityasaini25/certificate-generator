import "server-only";

import { prisma } from "@/lib/prisma";

import { parseSnapshot } from "./snapshot";

/**
 * Public certificate verification.
 *
 * Reads from `Certificate.snapshot` — the data frozen at issue time — not from
 * the live submission. A certificate must always represent what was approved
 * and printed, even if an administrator later edits the source record.
 *
 * Every field returned to the public is copied out explicitly below. Nothing is
 * spread from a database row, so a column added to the schema in future cannot
 * silently become public. Deliberately absent: database ids, the submission id,
 * admin identities, the internal workflow status, remarks, the submitter's IP,
 * the stored file path, and the applicant's email address.
 */

/** What a public caller is allowed to see for a valid certificate. */
export interface PublicCertificate {
  certificateNumber: string;
  applicantName: string;
  companyName: string | null;
  jobTitle: string | null;
  location: string | null;
  /** ISO 8601. */
  issuedAt: string;
  organisationName: string;
  /** Whether a downloadable document exists, not where it lives. */
  hasDocument: boolean;
}

/** A certificate that exists but is no longer current. */
export interface PublicWithdrawnCertificate {
  certificateNumber: string;
  issuedAt: string;
  /** ISO 8601, when known. The reason is internal and is never published. */
  withdrawnAt: string | null;
}

export type VerificationResult =
  | { outcome: "VERIFIED"; certificate: PublicCertificate }
  | { outcome: "NOT_CURRENTLY_VALID"; certificate: PublicWithdrawnCertificate }
  | { outcome: "NOT_FOUND" };

/**
 * Columns the verification path is allowed to read.
 *
 * `filePath` is selected only to derive a boolean; it never leaves the server.
 */
const VERIFY_SELECT = {
  certificateNo: true,
  snapshot: true,
  issuedAt: true,
  revokedAt: true,
  filePath: true,
  submission: { select: { status: true } },
} as const;

function displayName(
  firstName: string,
  lastName: string,
  fallback: string,
): string {
  const joined = [firstName, lastName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
  return joined || fallback.trim() || "—";
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Looks up a certificate for public verification.
 *
 * `certificateNumber` must already be normalised and validated by
 * `certificateNumberSchema`. The lookup is a single indexed equality match on a
 * unique column — cheap and safe to call repeatedly.
 */
export async function verifyCertificateNumber(
  certificateNumber: string,
): Promise<VerificationResult> {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNo: certificateNumber },
    select: VERIFY_SELECT,
  });

  if (!certificate) {
    return { outcome: "NOT_FOUND" };
  }

  // Business rule: only a genuinely issued certificate is publicly verifiable.
  // A Certificate row is only created when the submission completes, but this
  // is checked rather than assumed.
  if (certificate.submission.status !== "COMPLETED") {
    return { outcome: "NOT_FOUND" };
  }

  if (certificate.revokedAt) {
    return {
      outcome: "NOT_CURRENTLY_VALID",
      certificate: {
        certificateNumber: certificate.certificateNo,
        issuedAt: certificate.issuedAt.toISOString(),
        withdrawnAt: certificate.revokedAt.toISOString(),
        // revokeReason is internal and is intentionally not published.
      },
    };
  }

  const snapshot = parseSnapshot(certificate.snapshot);

  if (!snapshot) {
    // The record exists but its frozen data is unreadable. Publishing a
    // half-built result would be worse than reporting nothing.
    console.error(
      "[verify] unreadable snapshot for certificate",
      certificate.certificateNo,
    );
    return { outcome: "NOT_FOUND" };
  }

  return {
    outcome: "VERIFIED",
    certificate: {
      certificateNumber: certificate.certificateNo,
      applicantName: displayName(
        snapshot.submission.firstName,
        snapshot.submission.lastName,
        snapshot.submission.applicantName,
      ),
      companyName: emptyToNull(snapshot.submission.companyName),
      jobTitle: emptyToNull(snapshot.submission.jobTitle),
      location: emptyToNull(snapshot.submission.location),
      issuedAt: certificate.issuedAt.toISOString(),
      organisationName: snapshot.organisation.name,
      hasDocument: Boolean(certificate.filePath),
      // Note: snapshot.submission.email, .referenceNo, .comments, .documents
      // and .id are all available here and are deliberately NOT published.
    },
  };
}

/**
 * Resolves the stored PDF path for a publicly verifiable certificate.
 *
 * Returns null for anything the public may not download, so the caller cannot
 * distinguish "no such certificate" from "not currently valid".
 *
 * The path returned comes from the trusted database record; the caller supplies
 * only a certificate number.
 */
export async function findPublicCertificateFile(
  certificateNumber: string,
): Promise<{ certificateNumber: string; storagePath: string } | null> {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNo: certificateNumber },
    select: {
      certificateNo: true,
      filePath: true,
      revokedAt: true,
      submission: { select: { status: true } },
    },
  });

  if (
    !certificate?.filePath ||
    certificate.revokedAt ||
    certificate.submission.status !== "COMPLETED"
  ) {
    return null;
  }

  return {
    certificateNumber: certificate.certificateNo,
    storagePath: certificate.filePath,
  };
}
