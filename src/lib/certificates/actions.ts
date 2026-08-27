"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/dal";
import { submissionIdSchema } from "@/lib/validations/admin";

import { generateCertificate } from "./generate";

/**
 * Certificate generation action.
 *
 * Authorisation is enforced here, not by the page that renders the button:
 * invoking this action directly, with any submission id, still requires the
 * `certificate:generate` permission and an APPROVED submission.
 */

export interface GenerateCertificateState {
  ok?: boolean;
  error?: string;
  message?: string;
  certificateNo?: string;
}

export async function generateCertificateAction(
  _prev: GenerateCertificateState,
  formData: FormData,
): Promise<GenerateCertificateState> {
  const admin = await requirePermission("certificate:generate");

  const parsedId = submissionIdSchema.safeParse(formData.get("submissionId"));
  if (!parsedId.success) {
    return { error: "Invalid submission reference." };
  }

  const result = await generateCertificate(parsedId.data, {
    id: admin.id,
    name: admin.name,
    email: admin.email,
  });

  if (!result.ok) {
    return { error: result.message, certificateNo: result.certificateNo };
  }

  revalidatePath(`/admin/submissions/${parsedId.data}`);
  revalidatePath("/admin/submissions");
  revalidatePath("/admin");

  return {
    ok: true,
    message: `Certificate ${result.certificateNo} issued.`,
    certificateNo: result.certificateNo,
  };
}
