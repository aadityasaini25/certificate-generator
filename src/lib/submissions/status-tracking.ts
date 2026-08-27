import "server-only";

import { prisma } from "@/lib/prisma";
import type { SubmissionStatus } from "@/types";

/**
 * Public request status tracking.
 *
 * Looks a submission up by its existing reference ID — the same identifier
 * generated in `reference.ts` and shown in the admin panel. No second reference
 * system exists.
 *
 * This is NOT certificate verification: it reports the progress of a request,
 * whereas `verify.ts` reports an issued certificate. The two share no lookup
 * path and expose different data.
 *
 * Every published field is copied out explicitly below. Nothing is spread from
 * a database row, so a column added later cannot silently become public.
 * Deliberately absent: database ids, email, phone, submitter IP, uploaded
 * documents, file paths, admin identities, and the text of any remark.
 */

export type StageState = "done" | "current" | "upcoming";

export interface TimelineStage {
  key: string;
  label: string;
  state: StageState;
  /** ISO 8601, only when the date is genuinely known. */
  at: string | null;
}

export interface PublicRequestStatus {
  reference: string;
  /** Already masked/omitted according to configuration. */
  applicantName: string | null;
  /** ISO 8601. */
  submittedAt: string;
  /**
   * The status to present publicly, which is not always the stored one.
   *
   * A submission stored as COMPLETED with no certificate is reported as
   * APPROVED, because nothing has actually been issued. See
   * `awaitingCertificate`.
   */
  status: SubmissionStatus;
  /**
   * True when the record says complete but no certificate exists. The page
   * shows a "being prepared" message rather than claiming completion, and
   * never reveals that the record is inconsistent.
   */
  awaitingCertificate: boolean;
  timeline: TimelineStage[];
  /**
   * Set only when a certificate has been issued AND is publicly verifiable,
   * so the page can link to the existing verification feature. The internal
   * certificate id is never included.
   */
  certificateNumber: string | null;
}

/**
 * How far through the workflow each status sits.
 *
 * REJECTED shares a rank with APPROVED because it is the other outcome of
 * review, not a later stage.
 */
const STATUS_RANK: Record<SubmissionStatus, number> = {
  PENDING: 0,
  UNDER_REVIEW: 1,
  APPROVED: 2,
  REJECTED: 2,
  COMPLETED: 4,
};

/** Rank of the certificate stage, between approval and completion. */
const CERTIFICATE_RANK = 3;

/**
 * Masks a name to its first part plus initials, e.g. "MAMTA SAINI" -> "MAMTA S."
 *
 * Enough for an applicant to recognise their own request without publishing a
 * full name to anyone who holds the reference.
 */
export function maskApplicantName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0];

  const [first, ...rest] = parts;
  const initials = rest
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${first} ${initials}`;
}

export function presentApplicantName(
  fullName: string,
  mode: "masked" | "full" | "hidden",
): string | null {
  if (mode === "hidden") return null;
  if (mode === "full") return fullName;
  return maskApplicantName(fullName);
}

interface HistoryEntry {
  toStatus: SubmissionStatus;
  at: Date;
}

/**
 * Builds the progress timeline.
 *
 * Stages are marked reached from the current status, because the workflow only
 * allows a submission to arrive at a status by passing through the earlier
 * ones. Dates come from recorded history and are left null when unknown — a
 * stage is never given an invented timestamp, and a stage that has not been
 * reached is never shown as complete.
 */
function buildTimeline(
  status: SubmissionStatus,
  submittedAt: Date,
  history: HistoryEntry[],
  certificateIssuedAt: Date | null,
): TimelineStage[] {
  /** Earliest recorded arrival at a status, if any. */
  const firstReached = (target: SubmissionStatus): string | null => {
    const entry = history
      .filter((item) => item.toStatus === target)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    return entry ? entry.at.toISOString() : null;
  };

  const currentRank = STATUS_RANK[status];

  const stageState = (rank: number): StageState => {
    if (rank < currentRank) return "done";
    if (rank === currentRank) return "current";
    return "upcoming";
  };

  // The request was rejected: show the path actually taken and stop there.
  if (status === "REJECTED") {
    const reviewedAt = firstReached("UNDER_REVIEW");

    const stages: TimelineStage[] = [
      {
        key: "submitted",
        label: "Request Submitted",
        state: "done",
        at: submittedAt.toISOString(),
      },
    ];

    // Only shown when the request genuinely passed through review; a request
    // can be rejected straight from pending.
    if (reviewedAt) {
      stages.push({
        key: "under_review",
        label: "Under Review",
        state: "done",
        at: reviewedAt,
      });
    }

    stages.push({
      key: "rejected",
      label: "Rejected",
      state: "current",
      at: firstReached("REJECTED"),
    });

    return stages;
  }

  return [
    {
      key: "submitted",
      label: "Request Submitted",
      state: currentRank > 0 ? "done" : "current",
      at: submittedAt.toISOString(),
    },
    {
      key: "under_review",
      label: "Under Review",
      state: stageState(1),
      at: firstReached("UNDER_REVIEW"),
    },
    {
      key: "approved",
      label: "Approved",
      state: stageState(2),
      at: firstReached("APPROVED"),
    },
    {
      key: "certificate",
      label: "Certificate Generated",
      // Only complete once a certificate actually exists.
      state: certificateIssuedAt
        ? currentRank > CERTIFICATE_RANK
          ? "done"
          : "current"
        : "upcoming",
      at: certificateIssuedAt ? certificateIssuedAt.toISOString() : null,
    },
    {
      key: "completed",
      label: "Completed",
      state: stageState(4),
      at: firstReached("COMPLETED"),
    },
  ];
}

/**
 * Looks up a request for public status tracking.
 *
 * `reference` must already be normalised and validated by `referenceSchema`.
 * The lookup is a single indexed equality match on a unique column, so it is
 * cheap and safe to call repeatedly.
 */
export async function lookupRequestStatus(
  reference: string,
  nameMode: "masked" | "full" | "hidden",
): Promise<PublicRequestStatus | null> {
  const submission = await prisma.certificateSubmission.findUnique({
    where: { referenceNo: reference },
    select: {
      referenceNo: true,
      applicantName: true,
      submittedAt: true,
      status: true,
      certificate: {
        select: { certificateNo: true, issuedAt: true, revokedAt: true },
      },
      remarks: {
        // Status transitions only. `message` is deliberately NOT selected:
        // remarks are internal admin notes and must never reach the public.
        where: { toStatus: { not: null } },
        select: { toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) return null;

  const history: HistoryEntry[] = submission.remarks
    .filter(
      (remark): remark is { toStatus: SubmissionStatus; createdAt: Date } =>
        remark.toStatus !== null,
    )
    .map((remark) => ({ toStatus: remark.toStatus, at: remark.createdAt }));

  const certificate = submission.certificate;

  // COMPLETED is meant to imply an issued certificate. If one is missing the
  // request is not finished, so it is presented as approved-and-in-progress
  // rather than complete.
  const awaitingCertificate =
    submission.status === "COMPLETED" && !certificate;

  const displayStatus: SubmissionStatus = awaitingCertificate
    ? "APPROVED"
    : submission.status;

  // Only link to verification for a certificate the public can actually check.
  const publiclyVerifiable =
    certificate && !certificate.revokedAt && submission.status === "COMPLETED";

  return {
    reference: submission.referenceNo,
    applicantName: presentApplicantName(submission.applicantName, nameMode),
    submittedAt: submission.submittedAt.toISOString(),
    status: displayStatus,
    awaitingCertificate,
    timeline: buildTimeline(
      displayStatus,
      submission.submittedAt,
      history,
      certificate?.issuedAt ?? null,
    ),
    certificateNumber: publiclyVerifiable ? certificate.certificateNo : null,
  };
}
