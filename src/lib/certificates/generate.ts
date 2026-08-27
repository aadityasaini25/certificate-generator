import "server-only";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  deleteCertificatePdf,
  writeCertificatePdf,
} from "@/lib/storage/certificates";

import { nextCertificateNumber } from "./number";
import { renderCertificatePdf } from "./render";
import {
  CERTIFICATE_SNAPSHOT_VERSION,
  type CertificateSnapshot,
} from "./snapshot";
import { DEFAULT_TEMPLATE_KEY } from "./templates";

/**
 * Certificate generation service.
 *
 * Ordering is chosen so that a *committed* certificate always has its PDF on
 * disk. The PDF is rendered and written first; only then does the transaction
 * run. If the transaction fails or loses a race, the orphaned file is removed.
 * The opposite order would leave a visible defect — a certificate record whose
 * document does not exist — whereas a stray unreferenced file is harmless and
 * is cleaned up anyway.
 *
 * Duplicate prevention does not depend on the "does one already exist?" check
 * below, which is only a fast path. The real guarantee is the UNIQUE constraint
 * on `certificates.submissionId`: two concurrent requests both get past the
 * check, but only one INSERT can succeed.
 *
 * Callers must have already verified authentication and the
 * `certificate:generate` permission.
 */

export type GenerateCertificateResult =
  | { ok: true; certificateId: string; certificateNo: string }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_APPROVED"
        | "ALREADY_EXISTS"
        | "CONFLICT"
        | "FAILED";
      message: string;
      certificateNo?: string;
    };

/** Prisma's unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";
const MAX_ATTEMPTS = 5;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/** Which unique index the violation was on, when Prisma reports it. */
function violatedTarget(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "meta" in error &&
    typeof (error as { meta?: unknown }).meta === "object"
  ) {
    const meta = (error as { meta: Record<string, unknown> }).meta;
    const target = meta.target;
    if (typeof target === "string") return target;
    if (Array.isArray(target)) return target.join(",");
  }
  return "";
}

/** Raised inside the transaction when the submission moved under us. */
class SubmissionConflictError extends Error {}

interface SubmissionForCertificate {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantDesignation: string | null;
  companyName: string | null;
  location: string | null;
  additionalNotes: string | null;
  additionalData: unknown;
  submittedAt: Date;
  documents: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }[];
}

function nameParts(
  additionalData: unknown,
  fullName: string,
): { firstName: string; lastName: string } {
  if (additionalData && typeof additionalData === "object") {
    const data = additionalData as Record<string, unknown>;
    const first = typeof data.firstName === "string" ? data.firstName : null;
    const last = typeof data.lastName === "string" ? data.lastName : null;
    if (first || last) return { firstName: first ?? "", lastName: last ?? "" };
  }
  const [first, ...rest] = fullName.split(" ");
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

function buildSnapshot(
  submission: SubmissionForCertificate,
  certificateNo: string,
  issuedAt: Date,
  issuedBy: { name: string; email: string },
): CertificateSnapshot {
  const { firstName, lastName } = nameParts(
    submission.additionalData,
    submission.applicantName,
  );

  const organisationName = env.organisation.name.trim();

  return {
    version: CERTIFICATE_SNAPSHOT_VERSION,
    certificateNo,
    issuedAt: issuedAt.toISOString(),
    templateKey: DEFAULT_TEMPLATE_KEY,

    submission: {
      id: submission.id,
      referenceNo: submission.referenceNo,
      firstName,
      lastName,
      applicantName: submission.applicantName,
      email: submission.applicantEmail,
      companyName: submission.companyName,
      jobTitle: submission.applicantDesignation,
      location: submission.location,
      comments: submission.additionalNotes,
      submittedAt: submission.submittedAt.toISOString(),
      documents: submission.documents.map((document) => ({
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
      })),
    },

    issuedBy: { name: issuedBy.name, email: issuedBy.email },

    organisation: {
      // Falls back to a neutral label; the template stamps the certificate as
      // unconfigured so it cannot be mistaken for an issued document.
      name: organisationName || "Organisation not configured",
      address: env.organisation.address,
      website: env.organisation.website,
      isPlaceholder: organisationName === "",
    },
  };
}

export async function generateCertificate(
  submissionId: string,
  admin: { id: string; name: string; email: string },
): Promise<GenerateCertificateResult> {
  const submission = await prisma.certificateSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      referenceNo: true,
      applicantName: true,
      applicantEmail: true,
      applicantDesignation: true,
      companyName: true,
      location: true,
      additionalNotes: true,
      additionalData: true,
      status: true,
      submittedAt: true,
      documents: {
        select: { originalName: true, mimeType: true, sizeBytes: true },
        orderBy: { uploadedAt: "asc" },
      },
      certificate: { select: { id: true, certificateNo: true } },
    },
  });

  if (!submission) {
    return { ok: false, code: "NOT_FOUND", message: "Submission not found." };
  }

  // Fast path only — the unique constraint is what actually prevents duplicates.
  if (submission.certificate) {
    return {
      ok: false,
      code: "ALREADY_EXISTS",
      message: `A certificate has already been issued for this submission (${submission.certificate.certificateNo}).`,
      certificateNo: submission.certificate.certificateNo,
    };
  }

  if (submission.status !== "APPROVED") {
    return {
      ok: false,
      code: "NOT_APPROVED",
      message:
        "Only approved submissions can be issued a certificate. " +
        `This submission is currently ${submission.status}.`,
    };
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const issuedAt = new Date();

    // 1. Allocate a number. The database decides whether we keep it.
    const certificateNo = await nextCertificateNumber(prisma, issuedAt);

    // 2. Freeze the data and render the document.
    const snapshot = buildSnapshot(submission, certificateNo, issuedAt, admin);

    let pdf: Buffer;
    try {
      pdf = await renderCertificatePdf(snapshot);
    } catch (error) {
      console.error("[certificates] PDF rendering failed:", error);
      return {
        ok: false,
        code: "FAILED",
        message: "The certificate document could not be produced.",
      };
    }

    // 3. Write the file before committing, so a committed record can never
    //    reference a document that does not exist.
    let stored: { storagePath: string };
    try {
      stored = await writeCertificatePdf(pdf, issuedAt);
    } catch (error) {
      console.error("[certificates] writing the PDF failed:", error);
      return {
        ok: false,
        code: "FAILED",
        message: "The certificate document could not be saved.",
      };
    }

    // 4. Commit. Anything that fails from here rolls the file back too.
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Atomic compare-and-set: the row moves APPROVED -> COMPLETED only if
        // it is still APPROVED, so a concurrent status change cannot be lost.
        const moved = await tx.certificateSubmission.updateMany({
          where: { id: submission.id, status: "APPROVED" },
          data: { status: "COMPLETED" },
        });

        if (moved.count === 0) {
          throw new SubmissionConflictError(
            "The submission is no longer approved.",
          );
        }

        const certificate = await tx.certificate.create({
          data: {
            certificateNo,
            submissionId: submission.id,
            templateKey: snapshot.templateKey,
            // Cast: the snapshot is plain JSON by construction.
            snapshot: snapshot as unknown as object,
            filePath: stored.storagePath,
            issuedAt,
            issuedById: admin.id,
          },
          select: { id: true, certificateNo: true },
        });

        // Audit trail, in the existing remarks table — no second history model.
        await tx.submissionRemark.createMany({
          data: [
            {
              submissionId: submission.id,
              adminId: admin.id,
              message: `Certificate generated. Certificate No: ${certificateNo}.`,
              isInternal: true,
            },
            {
              submissionId: submission.id,
              adminId: admin.id,
              message: `Certificate issued and submission completed. Certificate No: ${certificateNo}.`,
              fromStatus: "APPROVED",
              toStatus: "COMPLETED",
              isInternal: true,
            },
          ],
        });

        return certificate;
      });

      return {
        ok: true,
        certificateId: created.id,
        certificateNo: created.certificateNo,
      };
    } catch (error) {
      // The transaction rolled back, so the file it would have referenced is
      // now an orphan.
      await deleteCertificatePdf(stored.storagePath);

      if (error instanceof SubmissionConflictError) {
        return {
          ok: false,
          code: "CONFLICT",
          message:
            "The submission changed while the certificate was being generated. Reload and try again.",
        };
      }

      if (isUniqueViolation(error)) {
        const target = violatedTarget(error);

        // Another request issued the certificate for this submission first.
        if (target.includes("submissionId")) {
          const existing = await prisma.certificate.findUnique({
            where: { submissionId: submission.id },
            select: { certificateNo: true },
          });
          return {
            ok: false,
            code: "ALREADY_EXISTS",
            message: `A certificate has already been issued for this submission${
              existing ? ` (${existing.certificateNo})` : ""
            }.`,
            certificateNo: existing?.certificateNo,
          };
        }

        // Lost the race for this number — take the next one and retry.
        if (attempt < MAX_ATTEMPTS) continue;
      }

      console.error("[certificates] generation failed:", error);
      return {
        ok: false,
        code: "FAILED",
        message: "The certificate could not be issued. Please try again.",
      };
    }
  }

  return {
    ok: false,
    code: "FAILED",
    message: `Could not allocate a unique certificate number after ${MAX_ATTEMPTS} attempts.`,
  };
}
