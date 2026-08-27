import { SUBMISSION_STATUS_META, SUBMISSION_STATUS_ORDER } from "@/lib/constants";
import type { SubmissionStatus } from "@/types";

/**
 * Status workflow rules.
 *
 * A single table of allowed transitions, so the same rules apply to the UI
 * (which buttons appear) and to the server action (which changes are accepted).
 * The UI never decides what is legal — it only reflects this table.
 *
 * The flow is deliberately not rigid: a submission can go back to review if a
 * decision turns out to be wrong. What is blocked is the nonsensical: skipping
 * review entirely, or editing a finished record.
 */

/**
 * Statuses an administrator may never select directly.
 *
 * COMPLETED means "a certificate has been issued for this request". It is a
 * consequence of certificate generation, not a decision someone makes, so
 * allowing it to be chosen manually could produce a submission marked complete
 * with no certificate behind it. Certificate generation performs that
 * transition itself, atomically and in the same transaction that creates the
 * Certificate row.
 */
export const MANUALLY_UNREACHABLE_STATUSES: readonly SubmissionStatus[] = [
  "COMPLETED",
];

export const ALLOWED_TRANSITIONS: Record<
  SubmissionStatus,
  readonly SubmissionStatus[]
> = {
  // A new request is either picked up for review or rejected outright.
  PENDING: ["UNDER_REVIEW", "REJECTED"],

  // Under review it can be decided either way, or put back in the queue.
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PENDING"],

  // An approved request leaves this state in one of two ways: certificate
  // generation completes it, or it goes back to review because the approval
  // was a mistake. COMPLETED is deliberately absent — see
  // MANUALLY_UNREACHABLE_STATUSES.
  APPROVED: ["UNDER_REVIEW", "REJECTED"],

  // A rejection can be reopened, e.g. when the applicant supplies more detail.
  REJECTED: ["UNDER_REVIEW"],

  // Terminal: a completed request has an issued certificate behind it.
  COMPLETED: [],
};

/** True when a status may only be reached by a privileged operation. */
export function isManuallyUnreachable(status: SubmissionStatus): boolean {
  return MANUALLY_UNREACHABLE_STATUSES.includes(status);
}

/** Why a manually unreachable status was refused. */
export function manuallyUnreachableMessage(status: SubmissionStatus): string {
  const label = SUBMISSION_STATUS_META[status].label;
  return (
    `${label} cannot be set manually. A submission becomes ${label} only ` +
    `when a certificate is generated for it.`
  );
}

/**
 * Whether an ordinary admin status change may move `from` -> `to`.
 *
 * Always false for a manually unreachable status, independently of the table
 * above, so the rule holds even if a destination list is edited carelessly
 * later.
 */
export function canTransition(
  from: SubmissionStatus,
  to: SubmissionStatus,
): boolean {
  if (isManuallyUnreachable(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(
  from: SubmissionStatus,
): readonly SubmissionStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

/** True once no further status change is possible. */
export function isTerminal(status: SubmissionStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * A submission's details stop being editable once it is finished, so an
 * issued certificate can never disagree with the record behind it.
 */
export function isEditable(status: SubmissionStatus): boolean {
  return status !== "COMPLETED";
}

export function transitionRejectedMessage(
  from: SubmissionStatus,
  to: SubmissionStatus,
): string {
  const fromLabel = SUBMISSION_STATUS_META[from].label;
  const toLabel = SUBMISSION_STATUS_META[to].label;

  if (isManuallyUnreachable(to)) {
    return manuallyUnreachableMessage(to);
  }

  const allowed = ALLOWED_TRANSITIONS[from];

  if (allowed.length === 0) {
    return `${fromLabel} is a final status and cannot be changed.`;
  }

  const allowedLabels = SUBMISSION_STATUS_ORDER.filter((status) =>
    allowed.includes(status),
  )
    .map((status) => SUBMISSION_STATUS_META[status].label)
    .join(" or ");

  return `Cannot move from ${fromLabel} to ${toLabel}. Allowed: ${allowedLabels}.`;
}
