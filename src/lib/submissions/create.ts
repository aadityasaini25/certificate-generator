import "server-only";

import { prisma } from "@/lib/prisma";
import type { StoredUpload } from "@/lib/storage/uploads";
import type { RequestFormValues } from "@/lib/validations/submission";

import { generateReferenceNo } from "./reference";

/**
 * Persists a public certificate request.
 *
 * The submission and its document are written in a single transaction, so a
 * failure can never leave a submission row without the document the applicant
 * attached.
 */

const MAX_REFERENCE_ATTEMPTS = 5;

/** Prisma's unique-constraint violation. */
const UNIQUE_VIOLATION = "P2002";

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export interface CreateSubmissionInput {
  values: RequestFormValues;
  upload: StoredUpload;
  submitterIp: string | null;
}

export interface CreateSubmissionResult {
  id: string;
  referenceNo: string;
}

export async function createSubmission({
  values,
  upload,
  submitterIp,
}: CreateSubmissionInput): Promise<CreateSubmissionResult> {
  const submittedAt = new Date();

  for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const referenceNo = generateReferenceNo(submittedAt);

    try {
      const submission = await prisma.$transaction(async (tx) => {
        return tx.certificateSubmission.create({
          data: {
            referenceNo,

            // Applicant. `applicantName` is the canonical, searchable name;
            // the original two parts are kept in additionalData so nothing the
            // applicant typed is lost.
            applicantName: `${values.firstName} ${values.lastName}`,
            applicantEmail: values.email.toLowerCase(),
            applicantDesignation: values.jobTitle ?? null,

            location: values.location,
            companyName: values.companyName ?? null,
            additionalNotes: values.comments ?? null,

            additionalData: {
              firstName: values.firstName,
              lastName: values.lastName,
              source: "public-request-form",
            },

            // Privacy consent. Validation guarantees this is true by now, but
            // the recorded value is what the applicant actually submitted.
            declarationAccepted: values.privacyConsent,
            declaredBy: `${values.firstName} ${values.lastName}`,
            declaredAt: submittedAt,

            // Applicants never choose their own status.
            status: "PENDING",
            submittedAt,
            submitterIp,

            documents: {
              create: {
                documentType: "SUPPORTING_DOCUMENT",
                originalName: upload.originalName,
                storedName: upload.storedName,
                storagePath: upload.storagePath,
                mimeType: upload.mimeType,
                sizeBytes: upload.sizeBytes,
              },
            },
          },
          select: { id: true, referenceNo: true },
        });
      });

      return submission;
    } catch (error) {
      // Reference number collided — generate another and try again.
      if (
        hasPrismaCode(error, UNIQUE_VIOLATION) &&
        attempt < MAX_REFERENCE_ATTEMPTS
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Could not allocate a unique reference number after ${MAX_REFERENCE_ATTEMPTS} attempts.`,
  );
}
