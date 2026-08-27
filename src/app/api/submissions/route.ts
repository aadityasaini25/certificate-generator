import { NextResponse, type NextRequest } from "next/server";

import { verifyCaptchaToken } from "@/lib/captcha/turnstile";
import { env } from "@/lib/env";
import { storeSubmissionDocument } from "@/lib/storage/uploads";
import { createSubmission } from "@/lib/submissions/create";
import {
  CAPTCHA_REQUIRED_MESSAGE,
  UPLOAD_REQUIRED_MESSAGE,
  requestFormSchema,
} from "@/lib/validations/submission";

/**
 * Public endpoint for the certificate request form.
 *
 * Everything the browser checked is checked again here — nothing that arrives
 * over the wire is trusted. The order matters: CAPTCHA and body size are
 * verified before the uploaded file is read into memory or written to disk.
 */

/** Headroom above the file limit for the text fields and multipart overhead. */
const NON_FILE_BODY_ALLOWANCE = 1024 * 1024;

function fieldErrorResponse(fieldErrors: Record<string, string[]>) {
  return NextResponse.json(
    {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    },
    { status: 400 },
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Reads the caller's IP from the proxy headers, for abuse tracing only. */
function clientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  return request.headers.get("x-real-ip")?.slice(0, 45) ?? null;
}

function readString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  // 1. Reject oversized bodies before buffering anything.
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const maxBody = env.storage.maxUploadSizeBytes + NON_FILE_BODY_ALLOWANCE;
  if (Number.isFinite(contentLength) && contentLength > maxBody) {
    const limitMb = Math.floor(env.storage.maxUploadSizeBytes / (1024 * 1024));
    return errorResponse(
      `Your upload is larger than ${limitMb}MB. Submit the form without an attachment and we will contact you.`,
      413,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Could not read the submitted form.", 400);
  }

  // 2. CAPTCHA, before any file handling.
  const captcha = await verifyCaptchaToken(
    readString(form, "captchaToken") || null,
    clientIp(request),
  );
  if (!captcha.success) {
    return fieldErrorResponse({
      captchaToken: [captcha.reason || CAPTCHA_REQUIRED_MESSAGE],
    });
  }

  // 3. Text fields.
  const parsed = requestFormSchema.safeParse({
    firstName: readString(form, "firstName"),
    lastName: readString(form, "lastName"),
    email: readString(form, "email"),
    companyName: readString(form, "companyName"),
    jobTitle: readString(form, "jobTitle"),
    location: readString(form, "location"),
    comments: readString(form, "comments"),
    privacyConsent: readString(form, "privacyConsent") === "true",
  });

  if (!parsed.success) {
    const flattened: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (flattened[key] ??= []).push(issue.message);
    }
    return fieldErrorResponse(flattened);
  }

  // 4. Document — required on this form.
  const file = form.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return fieldErrorResponse({ document: [UPLOAD_REQUIRED_MESSAGE] });
  }

  const stored = await storeSubmissionDocument(file);
  if (!stored.ok) {
    return fieldErrorResponse({ document: [stored.error] });
  }

  // 5. Persist.
  try {
    const submission = await createSubmission({
      values: parsed.data,
      upload: stored.upload,
      submitterIp: clientIp(request),
    });

    return NextResponse.json(
      { success: true, data: { referenceNo: submission.referenceNo } },
      { status: 201 },
    );
  } catch (error) {
    // Log the detail server-side; the client gets nothing about the database.
    console.error("[submissions] failed to persist submission:", error);
    return errorResponse(
      "We could not save your request. Please try again shortly.",
      500,
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
