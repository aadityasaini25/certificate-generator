"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  GENERIC_AUTH_ERROR,
  INACTIVE_ACCOUNT_ERROR,
  loginSchema,
} from "@/lib/validations/auth";

import { ADMIN_HOME_PATH, ADMIN_LOGIN_PATH } from "./dal";
import { verifyAgainstDecoy, verifyPassword } from "./password";
import { createSession, destroyCurrentSession } from "./session";

/**
 * Authentication server actions.
 *
 * Next.js verifies the request Origin for Server Actions, which gives these
 * CSRF protection without a hand-rolled token.
 */

export interface LoginFormState {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
}

/**
 * Only same-site admin paths are accepted as a post-login destination, so a
 * crafted `?next=` cannot turn the login page into an open redirect.
 */
function safeRedirectTarget(candidate: string | null): string {
  if (!candidate) return ADMIN_HOME_PATH;
  // Must be a root-relative admin path; "//evil.com" and "/\evil.com" are not.
  if (!/^\/admin(?:\/|$)/.test(candidate)) return ADMIN_HOME_PATH;
  if (candidate.startsWith("//")) return ADMIN_HOME_PATH;
  if (candidate === ADMIN_LOGIN_PATH) return ADMIN_HOME_PATH;
  return candidate;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: LoginFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        fieldErrors[key] ??= issue.message;
      }
    }
    return { fieldErrors };
  }

  const { email, password } = parsed.data;

  const admin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      // Nothing here is returned to the browser; the hash never leaves this
      // function.
    },
  });

  // Unknown email: still perform a bcrypt comparison so the response takes the
  // same time as a wrong password for a real account.
  if (!admin) {
    await verifyAgainstDecoy(password);
    return { error: GENERIC_AUTH_ERROR };
  }

  const passwordMatches = await verifyPassword(password, admin.passwordHash);
  if (!passwordMatches) {
    return { error: GENERIC_AUTH_ERROR };
  }

  // Reached only with correct credentials, so naming the reason here does not
  // disclose anything an attacker did not already know.
  if (!admin.isActive) {
    return { error: INACTIVE_ACCOUNT_ERROR };
  }

  const headerList = await headers();
  await createSession(admin.id, {
    ipAddress:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // Outside any try/catch: redirect signals by throwing.
  redirect(safeRedirectTarget(formData.get("next") as string | null));
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect(ADMIN_LOGIN_PATH);
}
