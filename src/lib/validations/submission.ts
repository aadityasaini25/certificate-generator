import { z } from "zod";

import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  LOCATION_OPTIONS,
} from "@/lib/constants";

/**
 * Validation rules for the public certificate request form.
 *
 * Imported by both the browser form and the API route so the two can never
 * drift apart. The server always re-runs these rules against the raw request —
 * the client-side pass exists purely to give fast feedback.
 */

const trimmed = z.string().trim();

/** Optional text: empty strings become `undefined` rather than "". */
function optionalText(max: number, label: string) {
  return trimmed
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

export const requestFormSchema = z.object({
  firstName: trimmed
    .min(1, "First name is required.")
    .max(100, "First name must be 100 characters or fewer."),

  lastName: trimmed
    .min(1, "Last name is required.")
    .max(100, "Last name must be 100 characters or fewer."),

  email: trimmed
    .min(1, "Email is required.")
    .max(254, "Email must be 254 characters or fewer.")
    .pipe(z.email("Enter a valid email address.")),

  companyName: optionalText(200, "Company name"),

  jobTitle: optionalText(150, "Job title"),

  location: trimmed
    .min(1, "Please select a location.")
    .refine(
      (value) => (LOCATION_OPTIONS as readonly string[]).includes(value),
      "Please select a location from the list.",
    ),

  comments: optionalText(5000, "Comments"),

  privacyConsent: z
    .boolean()
    .refine((value) => value === true, "You must accept the privacy statement."),
});

export type RequestFormValues = z.infer<typeof requestFormSchema>;

/** Shape the form state uses before validation — all strings, as the DOM gives them. */
export interface RequestFormState {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  location: string;
  comments: string;
  privacyConsent: boolean;
}

export const EMPTY_REQUEST_FORM: RequestFormState = {
  firstName: "",
  lastName: "",
  email: "",
  companyName: "",
  jobTitle: "",
  location: "",
  comments: "",
  privacyConsent: false,
};

// ---------------------------------------------------------------------------
// Upload validation
// ---------------------------------------------------------------------------

export interface FileCandidate {
  name: string;
  size: number;
}

/**
 * Checks a candidate upload by name and size.
 *
 * Returns an error message, or `null` when acceptable. The server repeats this
 * and additionally inspects the file's magic bytes, because a name and a
 * declared MIME type are both trivially forged.
 */
export function validateUploadCandidate(
  file: FileCandidate,
  maxSizeBytes: number = DEFAULT_MAX_UPLOAD_SIZE_BYTES,
): string | null {
  const name = file.name.toLowerCase();
  const hasAcceptedExtension = ACCEPTED_UPLOAD_EXTENSIONS.some((extension) =>
    name.endsWith(extension),
  );

  if (!hasAcceptedExtension) {
    return "Only PDF and ZIP files are accepted.";
  }

  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > maxSizeBytes) {
    const limitMb = Math.floor(maxSizeBytes / (1024 * 1024));
    return `File is larger than ${limitMb}MB. Submit the form without an attachment and we will contact you.`;
  }

  return null;
}

/** The document is mandatory on this form. */
export const UPLOAD_REQUIRED_MESSAGE = "Please attach your document.";

/** Turnstile did not produce a token, so there is nothing to verify. */
export const CAPTCHA_REQUIRED_MESSAGE =
  "Please complete the verification challenge.";
