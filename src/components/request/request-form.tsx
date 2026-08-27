"use client";

import { useRef, useState, type FormEvent } from "react";

import {
  CheckboxField,
  FileDropzone,
  SelectField,
  TextField,
  TextareaField,
  TurnstileWidget,
} from "@/components/form";
import { Button } from "@/components/ui";
import {
  LOCATION_OPTIONS,
  REQUEST_FORM,
  UPLOAD_HELP_TEXT,
} from "@/lib/constants";
import { publicConfig } from "@/lib/public-config";
import {
  CAPTCHA_REQUIRED_MESSAGE,
  EMPTY_REQUEST_FORM,
  UPLOAD_REQUIRED_MESSAGE,
  requestFormSchema,
  validateUploadCandidate,
  type RequestFormState,
} from "@/lib/validations/submission";

import { PrivacyConsentLabel } from "./privacy-consent-label";
import { SubmissionSuccess } from "./submission-success";

/**
 * Public certificate request form.
 *
 * Client-side validation mirrors the server's Zod schema so mistakes surface
 * immediately, but it is only a convenience — the API re-validates everything
 * and is the sole authority on what gets stored.
 */

type FieldErrors = Partial<Record<string, string>>;

interface SubmitSuccess {
  referenceNo: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  data?: { referenceNo: string };
  fieldErrors?: Record<string, string[]>;
}

export function RequestForm() {
  const [values, setValues] = useState<RequestFormState>(EMPTY_REQUEST_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitSuccess | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  function setValue<K extends keyof RequestFormState>(
    key: K,
    value: RequestFormState[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the field's error as soon as the user starts correcting it.
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  /** Runs the shared schema plus the file and CAPTCHA checks. */
  function validate(): FieldErrors {
    const found: FieldErrors = {};

    const parsed = requestFormSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        found[key] ??= issue.message;
      }
    }

    if (!file) {
      found.document = UPLOAD_REQUIRED_MESSAGE;
    } else {
      const fileError = validateUploadCandidate(
        { name: file.name, size: file.size },
        publicConfig.maxUploadSizeBytes,
      );
      if (fileError) found.document = fileError;
    }

    // Only demand a token when a CAPTCHA is actually configured.
    if (publicConfig.turnstile.siteKey && !captchaToken) {
      found.captchaToken = CAPTCHA_REQUIRED_MESSAGE;
    }

    return found;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      errorSummaryRef.current?.focus();
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.set("firstName", values.firstName);
      body.set("lastName", values.lastName);
      body.set("email", values.email);
      body.set("companyName", values.companyName);
      body.set("jobTitle", values.jobTitle);
      body.set("location", values.location);
      body.set("comments", values.comments);
      body.set("privacyConsent", String(values.privacyConsent));
      body.set("captchaToken", captchaToken ?? "");
      if (file) body.set("document", file);

      const response = await fetch("/api/submissions", {
        method: "POST",
        body,
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.success) {
        if (payload.fieldErrors) {
          const mapped: FieldErrors = {};
          for (const [key, messages] of Object.entries(payload.fieldErrors)) {
            if (messages[0]) mapped[key] = messages[0];
          }
          setErrors(mapped);
        }
        setFormError(
          payload.error ?? "Something went wrong. Please try again.",
        );
        // The token has been consumed — force a fresh challenge.
        setCaptchaResetSignal((n) => n + 1);
        errorSummaryRef.current?.focus();
        return;
      }

      setResult({ referenceNo: payload.data?.referenceNo ?? "" });
    } catch {
      setFormError(
        "We could not reach the server. Check your connection and try again.",
      );
      setCaptchaResetSignal((n) => n + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return <SubmissionSuccess referenceNo={result.referenceNo} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      {/* Focus target for the error summary, announced on failed submit. */}
      <div
        ref={errorSummaryRef}
        tabIndex={-1}
        role="alert"
        aria-live="assertive"
        className="outline-none"
      >
        {formError ? (
          <div className="rounded-card border border-status-danger bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
            {formError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="firstName"
          label="First Name"
          required
          autoComplete="given-name"
          value={values.firstName}
          error={errors.firstName}
          disabled={isSubmitting}
          onChange={(e) => setValue("firstName", e.target.value)}
        />
        <TextField
          id="lastName"
          label="Last Name"
          required
          autoComplete="family-name"
          value={values.lastName}
          error={errors.lastName}
          disabled={isSubmitting}
          onChange={(e) => setValue("lastName", e.target.value)}
        />
      </div>

      <TextField
        id="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={values.email}
        error={errors.email}
        disabled={isSubmitting}
        onChange={(e) => setValue("email", e.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="companyName"
          label="Company Name"
          autoComplete="organization"
          value={values.companyName}
          error={errors.companyName}
          disabled={isSubmitting}
          onChange={(e) => setValue("companyName", e.target.value)}
        />
        <TextField
          id="jobTitle"
          label="Job Title"
          autoComplete="organization-title"
          value={values.jobTitle}
          error={errors.jobTitle}
          disabled={isSubmitting}
          onChange={(e) => setValue("jobTitle", e.target.value)}
        />
      </div>

      <SelectField
        id="location"
        label="Location"
        required
        options={LOCATION_OPTIONS}
        value={values.location}
        error={errors.location}
        disabled={isSubmitting}
        onChange={(e) => setValue("location", e.target.value)}
      />

      <TextareaField
        id="comments"
        label="Comments"
        rows={6}
        value={values.comments}
        error={errors.comments}
        disabled={isSubmitting}
        onChange={(e) => setValue("comments", e.target.value)}
      />

      <FileDropzone
        label={REQUEST_FORM.uploadHeading}
        helpText={UPLOAD_HELP_TEXT}
        required
        file={file}
        error={errors.document}
        disabled={isSubmitting}
        onFileChange={(next) => {
          setFile(next);
          setErrors((current) => {
            if (!current.document) return current;
            const updated = { ...current };
            delete updated.document;
            return updated;
          });
        }}
      />

      <CheckboxField
        checked={values.privacyConsent}
        onCheckedChange={(checked) => setValue("privacyConsent", checked)}
        required
        error={errors.privacyConsent}
        disabled={isSubmitting}
        label={<PrivacyConsentLabel />}
      />

      <TurnstileWidget
        onToken={(token) => {
          setCaptchaToken(token);
          if (token) {
            setErrors((current) => {
              if (!current.captchaToken) return current;
              const updated = { ...current };
              delete updated.captchaToken;
              return updated;
            });
          }
        }}
        resetSignal={captchaResetSignal}
        error={errors.captchaToken}
      />

      <div className="flex justify-center pt-1">
        <Button
          type="submit"
          variant="cta"
          size="lg"
          isLoading={isSubmitting}
          className="min-w-56"
        >
          {isSubmitting ? "Sending…" : REQUEST_FORM.submitLabel}
        </Button>
      </div>
    </form>
  );
}
