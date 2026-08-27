import type { SubmissionStatus } from "@/generated/prisma/enums";

/**
 * Domain constants shared by the public site and the admin panel.
 *
 * Safe to import from Client Components — nothing here touches the database or
 * reads a secret.
 */

/** Branding. Change these in one place to re-skin the application. */
export const APP = {
  name: "Certificate",
  shortName: "Certificate",
  tagline: "Certificate & document submission portal",
  supportEmail: "support@certificate.local",
} as const;

/**
 * Legal/organisation identity used in the privacy consent sentence.
 *
 * Deliberately NOT hard-coded to a client's brand: set
 * NEXT_PUBLIC_ORGANISATION_NAME and NEXT_PUBLIC_PRIVACY_POLICY_URL once the
 * client confirms the name and the real policy URL. See `publicConfig`.
 */
export const REQUEST_FORM = {
  heading: "Request a certificate verification",
  intro:
    "Complete the form below and upload your document. Our team will review " +
    "your request and get back to you.",
  uploadHeading: "Upload your document(s) for verification",
  submitLabel: "Send Your Request",
  successTitle: "Your request has been submitted successfully.",
  successBody:
    "Our team will review your information and contact you if required.",
} as const;

export type StatusTone = "neutral" | "info" | "success" | "danger" | "accent";

export interface StatusMeta {
  value: SubmissionStatus;
  label: string;
  description: string;
  tone: StatusTone;
}

/**
 * Presentation metadata for every submission status.
 *
 * Adding a status means: add the enum value in `schema.prisma`, run a
 * migration, then add one entry here. Nothing else in the UI hard-codes a
 * status name.
 */
export const SUBMISSION_STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  PENDING: {
    value: "PENDING",
    label: "Pending",
    description: "Received and waiting to be picked up for review.",
    tone: "neutral",
  },
  UNDER_REVIEW: {
    value: "UNDER_REVIEW",
    label: "Under review",
    description: "An administrator is currently verifying the submission.",
    tone: "info",
  },
  APPROVED: {
    value: "APPROVED",
    label: "Approved",
    description: "Verified and cleared for certificate generation.",
    tone: "success",
  },
  REJECTED: {
    value: "REJECTED",
    label: "Rejected",
    description: "Declined. The remarks explain why.",
    tone: "danger",
  },
  COMPLETED: {
    value: "COMPLETED",
    label: "Completed",
    description: "Certificate generated and issued to the applicant.",
    tone: "accent",
  },
};

/**
 * Applicant-facing status wording.
 *
 * Separate from `SUBMISSION_STATUS_META.description`, which is written for
 * administrators. These strings are shown to the public, so they say what the
 * applicant needs to know and nothing about internal process.
 */
export const PUBLIC_STATUS_MESSAGES: Record<SubmissionStatus, string> = {
  PENDING: "Your request has been received and is waiting for review.",
  UNDER_REVIEW: "Your request is currently being reviewed by our team.",
  APPROVED: "Your request has been approved.",
  REJECTED:
    "Your request has been rejected. Please contact us if you require further information.",
  COMPLETED: "Your request has been completed.",
};

/**
 * Shown when a request is marked complete but no certificate exists yet.
 *
 * Reporting "Completed" would be untrue — nothing has been issued. This says
 * where the request actually stands without exposing that the record is
 * internally inconsistent.
 */
export const PUBLIC_AWAITING_CERTIFICATE_MESSAGE =
  "Your request has been approved and your certificate is being prepared. " +
  "Please check back shortly.";

/** Short applicant-facing label for each status. */
export const PUBLIC_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

/** Display order for status filters, dashboards and tabs. */
export const SUBMISSION_STATUS_ORDER: readonly SubmissionStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
] as const;

/**
 * Accepted upload formats: a single PDF, or several documents bundled into one
 * ZIP. Browsers disagree on the MIME type they report for ZIP files, so the
 * server treats the extension and the file's magic bytes as authoritative and
 * uses this list only as a first-pass filter.
 */
export const ACCEPTED_UPLOAD_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
  // Some browsers fall back to this for .zip; the magic-byte check catches
  // anything that is not actually a ZIP.
  "application/octet-stream",
] as const;

export const ACCEPTED_UPLOAD_EXTENSIONS: readonly string[] = [
  ".pdf",
  ".zip",
] as const;

/** Value used by the `accept` attribute on the file input. */
export const UPLOAD_ACCEPT_ATTRIBUTE = ".pdf,.zip,application/pdf,application/zip";

/** Mirrors MAX_UPLOAD_SIZE_BYTES; used for client-side hints only. */
export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

/** Guidance shown under the upload area. */
export const UPLOAD_HELP_TEXT =
  "Single documents as pdf files, multiple documents in a single zip file, " +
  "maximum file size 20MB. For files exceeding 20MB, complete and submit the " +
  "form without an attachment, and we will contact you.";

/**
 * Locations offered by the request form.
 *
 * Static for now because there is no requirement to manage them at runtime.
 * If that changes, move this to a `location` table and load it server-side —
 * nothing else in the codebase assumes the list is static.
 */
export const LOCATION_OPTIONS: readonly string[] = [
  "Australia",
  "Bangladesh",
  "Brazil",
  "Canada",
  "China",
  "France",
  "Germany",
  "Hong Kong SAR, China",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "Pakistan",
  "Philippines",
  "Poland",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Switzerland",
  "Taiwan, China",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Other",
] as const;
