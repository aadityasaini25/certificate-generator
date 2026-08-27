"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { TextareaField } from "@/components/form";
import { Button } from "@/components/ui";
import { addRemarkAction, type ActionState } from "@/lib/submissions/actions";

/**
 * Adds a standalone remark (no status change).
 *
 * Remarks default to internal; marking one visible is a deliberate act, so an
 * internal note cannot be exposed to an applicant by accident.
 */

const INITIAL: ActionState = {};

export function RemarkForm({ submissionId }: { submissionId: string }) {
  const [state, formAction, isPending] = useActionState(
    addRemarkAction,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea once the remark has been stored.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />

      {state.ok && state.message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-status-success bg-status-success-bg px-3 py-2 text-sm text-status-success"
        >
          <CheckCircle2 aria-hidden className="size-4" />
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-status-danger bg-status-danger-bg px-3 py-2 text-sm text-status-danger"
        >
          {state.error}
        </p>
      ) : null}

      <TextareaField
        id="remark-message"
        name="message"
        label="Add a remark"
        rows={4}
        required
        disabled={isPending}
        placeholder="Notes about this submission…"
        error={state.fieldErrors?.message}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          {/* Unchecked checkboxes submit nothing, so a hidden "false" carries
              the visible-to-applicant case explicitly. */}
          <input type="hidden" name="isInternal" value="false" />
          <input
            type="checkbox"
            name="isInternal"
            value="true"
            defaultChecked
            disabled={isPending}
            className="mt-0.5 size-4 rounded border-line-strong accent-brand-600"
          />
          Internal note (not shown to the applicant)
        </label>

        <Button type="submit" isLoading={isPending}>
          {isPending ? "Saving…" : "Add remark"}
        </Button>
      </div>
    </form>
  );
}
