"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { SelectField, TextField, TextareaField } from "@/components/form";
import { Button, buttonClasses } from "@/components/ui";
import { editSubmissionAction, type ActionState } from "@/lib/submissions/actions";
import { LOCATION_OPTIONS } from "@/lib/constants";

/**
 * Admin edit form.
 *
 * Only the applicant's details are editable. Uploaded documents are not part of
 * this form at all, so saving an edit can never replace or remove a file — a
 * document change would have to be an explicit, separate action.
 */

const INITIAL: ActionState = {};

export interface EditSubmissionFormProps {
  submissionId: string;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    jobTitle: string;
    location: string;
    comments: string;
  };
}

export function EditSubmissionForm({
  submissionId,
  defaults,
}: EditSubmissionFormProps) {
  const [state, formAction, isPending] = useActionState(
    editSubmissionAction,
    INITIAL,
  );
  const router = useRouter();

  // Refresh so the detail page behind this form shows the saved values.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="submissionId" value={submissionId} />

      {state.ok && state.message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-status-success bg-status-success-bg px-3.5 py-3 text-sm text-status-success"
        >
          <CheckCircle2 aria-hidden className="size-4" />
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3 text-sm text-status-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="firstName"
          name="firstName"
          label="First Name"
          required
          defaultValue={defaults.firstName}
          disabled={isPending}
          error={state.fieldErrors?.firstName}
        />
        <TextField
          id="lastName"
          name="lastName"
          label="Last Name"
          required
          defaultValue={defaults.lastName}
          disabled={isPending}
          error={state.fieldErrors?.lastName}
        />
      </div>

      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        required
        defaultValue={defaults.email}
        disabled={isPending}
        error={state.fieldErrors?.email}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="companyName"
          name="companyName"
          label="Company Name"
          defaultValue={defaults.companyName}
          disabled={isPending}
          error={state.fieldErrors?.companyName}
        />
        <TextField
          id="jobTitle"
          name="jobTitle"
          label="Job Title"
          defaultValue={defaults.jobTitle}
          disabled={isPending}
          error={state.fieldErrors?.jobTitle}
        />
      </div>

      <SelectField
        id="location"
        name="location"
        label="Location"
        required
        options={LOCATION_OPTIONS}
        defaultValue={defaults.location}
        disabled={isPending}
        error={state.fieldErrors?.location}
      />

      <TextareaField
        id="comments"
        name="comments"
        label="Comments"
        rows={6}
        defaultValue={defaults.comments}
        disabled={isPending}
        error={state.fieldErrors?.comments}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
        <Link
          href={`/admin/submissions/${submissionId}`}
          className={buttonClasses({ variant: "secondary" })}
        >
          Cancel
        </Link>
        <Button type="submit" isLoading={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
