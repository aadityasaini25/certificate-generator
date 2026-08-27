"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  addRemarkSchema,
  changeStatusSchema,
  editSubmissionSchema,
  submissionIdSchema,
} from "@/lib/validations/admin";
import type { SubmissionStatus } from "@/types";

import {
  canTransition,
  isEditable,
  isManuallyUnreachable,
  manuallyUnreachableMessage,
  transitionRejectedMessage,
} from "./status";

/**
 * Admin write operations.
 *
 * Every action independently re-establishes who is calling and what they may
 * do. Nothing relies on the page having hidden a button: an action invoked
 * directly, with any id the caller likes, still goes through the same checks.
 *
 * Next.js verifies the request Origin for Server Actions, which covers CSRF.
 */

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Reads and validates the submission id, never trusting the raw form value. */
function readSubmissionId(formData: FormData): string | null {
  const parsed = submissionIdSchema.safeParse(formData.get("submissionId"));
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// Edit submission details
// ---------------------------------------------------------------------------

export async function editSubmissionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePermission("submission:edit");

  const submissionId = readSubmissionId(formData);
  if (!submissionId) {
    return { error: "Invalid submission reference." };
  }

  const parsed = editSubmissionSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    location: formData.get("location"),
    comments: formData.get("comments"),
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const existing = await prisma.certificateSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, status: true, additionalData: true },
  });

  if (!existing) {
    return { error: "Submission not found." };
  }

  if (!isEditable(existing.status)) {
    return {
      error: "Completed submissions can no longer be edited.",
    };
  }

  const values = parsed.data;

  // Preserve anything already in additionalData; only the name parts change.
  const existingExtra =
    existing.additionalData && typeof existing.additionalData === "object"
      ? (existing.additionalData as Record<string, unknown>)
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.certificateSubmission.update({
      where: { id: submissionId },
      data: {
        applicantName: `${values.firstName} ${values.lastName}`,
        applicantEmail: values.email.toLowerCase(),
        applicantDesignation: values.jobTitle ?? null,
        companyName: values.companyName ?? null,
        location: values.location,
        additionalNotes: values.comments ?? null,
        additionalData: {
          ...existingExtra,
          firstName: values.firstName,
          lastName: values.lastName,
          lastEditedBy: admin.email,
          lastEditedAt: new Date().toISOString(),
        },
      },
    });

    // Editing an applicant's details is recorded, so the audit trail explains
    // why a stored value differs from what was originally submitted.
    await tx.submissionRemark.create({
      data: {
        submissionId,
        adminId: admin.id,
        message: `Submission details edited by ${admin.name}.`,
        isInternal: true,
      },
    });
  });

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");

  return { ok: true, message: "Submission updated." };
}

// ---------------------------------------------------------------------------
// Change status
// ---------------------------------------------------------------------------

export async function changeStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Deciding an outcome is a stronger permission than editing details.
  const admin = await requirePermission("submission:decide");

  const submissionId = readSubmissionId(formData);
  if (!submissionId) {
    return { error: "Invalid submission reference." };
  }

  const parsed = changeStatusSchema.safeParse({
    toStatus: formData.get("toStatus"),
    remark: formData.get("remark"),
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const toStatus = parsed.data.toStatus as SubmissionStatus;

  // COMPLETED is not an ordinary destination: it means "a certificate exists",
  // and only certificate generation can make that true. Refused here before any
  // lookup, so a forged or replayed request naming it cannot proceed no matter
  // what the transition table happens to say.
  if (isManuallyUnreachable(toStatus)) {
    return { error: manuallyUnreachableMessage(toStatus) };
  }

  const existing = await prisma.certificateSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, status: true },
  });

  if (!existing) {
    return { error: "Submission not found." };
  }

  const fromStatus = existing.status;

  if (fromStatus === toStatus) {
    return { error: "That is already the current status." };
  }

  // The workflow table is the authority, not the buttons the page rendered.
  if (!canTransition(fromStatus, toStatus)) {
    return { error: transitionRejectedMessage(fromStatus, toStatus) };
  }

  const decidedAt = new Date();
  const isDecision = toStatus === "APPROVED" || toStatus === "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.certificateSubmission.update({
      where: { id: submissionId },
      data: {
        status: toStatus,
        ...(isDecision
          ? { reviewedAt: decidedAt, reviewedById: admin.id }
          : {}),
      },
    });

    await tx.submissionRemark.create({
      data: {
        submissionId,
        adminId: admin.id,
        message: parsed.data.remark ?? `Status changed to ${toStatus}.`,
        fromStatus,
        toStatus,
        isInternal: true,
      },
    });
  });

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");

  return { ok: true, message: `Status updated to ${toStatus}.` };
}

// ---------------------------------------------------------------------------
// Add a remark
// ---------------------------------------------------------------------------

export async function addRemarkAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePermission("submission:edit");

  const submissionId = readSubmissionId(formData);
  if (!submissionId) {
    return { error: "Invalid submission reference." };
  }

  const parsed = addRemarkSchema.safeParse({
    message: formData.get("message"),
    // Two inputs share this name (a hidden "false" plus the checkbox), so the
    // LAST value is the authoritative one.
    isInternal: formData.getAll("isInternal").at(-1) !== "false",
  });

  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const exists = await prisma.certificateSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true },
  });

  if (!exists) {
    return { error: "Submission not found." };
  }

  await prisma.submissionRemark.create({
    data: {
      submissionId,
      adminId: admin.id,
      message: parsed.data.message,
      isInternal: parsed.data.isInternal,
    },
  });

  revalidatePath(`/admin/submissions/${submissionId}`);

  return { ok: true, message: "Remark added." };
}

// ---------------------------------------------------------------------------
// Recover an inconsistent submission
// ---------------------------------------------------------------------------

/**
 * Returns a COMPLETED submission that has no certificate back to APPROVED.
 *
 * COMPLETED is supposed to mean "a certificate was issued". A submission in
 * that state without one is invalid — historically reachable through a manual
 * status change that is now blocked. This is the supervised way out: it does
 * not create a certificate, it puts the submission back where a normal
 * `Generate Certificate` can be performed deliberately.
 *
 * Safety properties:
 *  - requires `certificate:generate`, so a reviewer cannot invoke it;
 *  - the update is conditional on the submission still being COMPLETED, so a
 *    concurrent change cannot be overwritten;
 *  - it re-checks for a certificate INSIDE the transaction, so a submission
 *    that legitimately has one is never dragged backwards;
 *  - it is recorded in the audit trail, clearly labelled as a recovery.
 */
export async function recoverSubmissionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePermission("certificate:generate");

  const submissionId = readSubmissionId(formData);
  if (!submissionId) {
    return { error: "Invalid submission reference." };
  }

  const existing = await prisma.certificateSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      certificate: { select: { certificateNo: true } },
    },
  });

  if (!existing) {
    return { error: "Submission not found." };
  }

  if (existing.status !== "COMPLETED") {
    return {
      error: "Only a completed submission with no certificate can be recovered.",
    };
  }

  if (existing.certificate) {
    return {
      error:
        `This submission has certificate ${existing.certificate.certificateNo} ` +
        `and is not in an invalid state. Nothing to recover.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: a certificate may have been issued
      // between the read above and here.
      const certificate = await tx.certificate.findUnique({
        where: { submissionId },
        select: { id: true },
      });

      if (certificate) {
        throw new Error("CERTIFICATE_EXISTS");
      }

      const moved = await tx.certificateSubmission.updateMany({
        where: { id: submissionId, status: "COMPLETED" },
        data: { status: "APPROVED" },
      });

      if (moved.count === 0) {
        throw new Error("STATUS_CHANGED");
      }

      await tx.submissionRemark.create({
        data: {
          submissionId,
          adminId: admin.id,
          message:
            `Recovery: submission was marked Completed with no certificate ` +
            `and has been returned to Approved by ${admin.name} so a ` +
            `certificate can be generated.`,
          fromStatus: "COMPLETED",
          toStatus: "APPROVED",
          isInternal: true,
        },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "CERTIFICATE_EXISTS") {
      return {
        error: "A certificate was issued for this submission. Nothing to recover.",
      };
    }
    if (reason === "STATUS_CHANGED") {
      return { error: "The submission changed. Reload and try again." };
    }
    console.error("[submissions] recovery failed:", error);
    return { error: "Recovery failed. Please try again." };
  }

  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Submission returned to Approved. You can now generate a certificate.",
  };
}
