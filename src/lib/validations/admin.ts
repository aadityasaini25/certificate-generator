import { z } from "zod";

import { LOCATION_OPTIONS, SUBMISSION_STATUS_ORDER } from "@/lib/constants";

/**
 * Validation for admin-side submission operations.
 *
 * Mirrors the public form's rules for the fields they share, so an admin
 * correcting a record cannot store something the public form would have
 * rejected.
 */

const trimmed = z.string().trim();

function optionalText(max: number, label: string) {
  return trimmed
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

export const editSubmissionSchema = z.object({
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
});

export type EditSubmissionValues = z.infer<typeof editSubmissionSchema>;

const statusEnum = z.enum(
  SUBMISSION_STATUS_ORDER as unknown as [string, ...string[]],
);

export const changeStatusSchema = z
  .object({
    toStatus: statusEnum,
    remark: optionalText(2000, "Remark"),
  })
  .refine(
    // A rejection that gives no reason is not reviewable later, so require one.
    (value) => value.toStatus !== "REJECTED" || Boolean(value.remark),
    {
      message: "A remark is required when rejecting a submission.",
      path: ["remark"],
    },
  );

export type ChangeStatusValues = z.infer<typeof changeStatusSchema>;

export const addRemarkSchema = z.object({
  message: trimmed
    .min(1, "Remark cannot be empty.")
    .max(2000, "Remark must be 2000 characters or fewer."),
  isInternal: z.boolean(),
});

export type AddRemarkValues = z.infer<typeof addRemarkSchema>;

/**
 * Submission ids are cuids generated server-side. Constraining the shape stops
 * obviously malformed ids from reaching a query.
 */
export const submissionIdSchema = z
  .string()
  .trim()
  .min(1, "Missing submission id.")
  .max(64, "Invalid submission id.")
  .regex(/^[a-z0-9]+$/i, "Invalid submission id.");
