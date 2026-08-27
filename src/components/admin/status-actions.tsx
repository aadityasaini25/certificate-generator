"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";

import { TextareaField } from "@/components/form";
import { Button, ConfirmDialog, StatusBadge } from "@/components/ui";
import { changeStatusAction, type ActionState } from "@/lib/submissions/actions";
import { SUBMISSION_STATUS_META } from "@/lib/constants";
import type { SubmissionStatus } from "@/types";

/**
 * Status change controls.
 *
 * The available buttons come from the server-provided transition list, and
 * every change is confirmed in a dialog before it is sent. Hiding a button is
 * presentation only — the server action re-checks the permission and the
 * transition, so an unavailable change is refused even if invoked directly.
 */

const INITIAL: ActionState = {};

export interface StatusActionsProps {
  submissionId: string;
  currentStatus: SubmissionStatus;
  /** Transitions the workflow allows from the current status. */
  availableStatuses: readonly SubmissionStatus[];
  /** False when the signed-in admin lacks submission:decide. */
  canDecide: boolean;
}

export function StatusActions({
  submissionId,
  currentStatus,
  availableStatuses,
  canDecide,
}: StatusActionsProps) {
  const [state, formAction, isPending] = useActionState(
    changeStatusAction,
    INITIAL,
  );
  const [pendingStatus, setPendingStatus] = useState<SubmissionStatus | null>(
    null,
  );
  const [remark, setRemark] = useState("");

  // Close the dialog once the change has been applied. Adjusting state during
  // render (rather than in an effect) is React's recommended way to react to a
  // changed value, and avoids a second render pass.
  const [handledResult, setHandledResult] = useState(state);
  if (state !== handledResult) {
    setHandledResult(state);
    if (state.ok) {
      setPendingStatus(null);
      setRemark("");
    }
  }

  if (!canDecide) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Lock aria-hidden className="size-4" />
        Your role cannot change submission status.
      </p>
    );
  }

  if (availableStatuses.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Lock aria-hidden className="size-4" />
        {SUBMISSION_STATUS_META[currentStatus].label} is a final status and
        cannot be changed.
      </p>
    );
  }

  const isRejection = pendingStatus === "REJECTED";

  return (
    <div className="space-y-3">
      {state.ok && state.message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-status-success bg-status-success-bg px-3 py-2 text-sm text-status-success"
        >
          <CheckCircle2 aria-hidden className="size-4" />
          {state.message}
        </p>
      ) : null}

      {state.error && !pendingStatus ? (
        <p
          role="alert"
          className="rounded-control border border-status-danger bg-status-danger-bg px-3 py-2 text-sm text-status-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {availableStatuses.map((status) => (
          <Button
            key={status}
            variant={status === "REJECTED" ? "danger" : "primary"}
            size="sm"
            onClick={() => {
              setPendingStatus(status);
              setRemark("");
            }}
          >
            Move to {SUBMISSION_STATUS_META[status].label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        title="Change submission status"
        confirmLabel="Confirm change"
        confirmVariant={isRejection ? "danger" : "primary"}
        isPending={isPending}
        onCancel={() => {
          if (!isPending) setPendingStatus(null);
        }}
        formAction={formAction}
        description={
          pendingStatus ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span aria-hidden>→</span>
              <StatusBadge status={pendingStatus} />
            </span>
          ) : null
        }
      >
        <div className="space-y-2">
          <input type="hidden" name="submissionId" value={submissionId} />
          <input type="hidden" name="toStatus" value={pendingStatus ?? ""} />
          <TextareaField
            name="remark"
            id="status-remark"
            label="Remark"
            rows={4}
            required={isRejection}
            value={remark}
            disabled={isPending}
            onChange={(event) => setRemark(event.target.value)}
            error={state.fieldErrors?.remark}
            hint={
              isRejection
                ? "A remark is required when rejecting, so the decision can be reviewed later."
                : "Optional. Recorded in the submission history."
            }
          />
          {state.error && pendingStatus ? (
            <p role="alert" className="text-sm text-status-danger">
              {state.error}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
