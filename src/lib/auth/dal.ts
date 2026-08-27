import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getCurrentSession, type AuthenticatedAdmin } from "./session";
import { can, type Permission } from "./authorize";

/**
 * Data access layer for authentication.
 *
 * Every protected server route, Server Action and data function calls one of
 * these rather than trusting a layout or middleware to have already checked.
 * Auth is enforced where the data is read, which is the only place it cannot
 * be bypassed by a route that forgot to opt in.
 */

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";

/**
 * The current admin, or null.
 *
 * `cache` dedupes the lookup within a single request, so a layout and the page
 * it renders share one database round-trip.
 */
export const getAuthenticatedAdmin = cache(
  async (): Promise<AuthenticatedAdmin | null> => getCurrentSession(),
);

/**
 * Requires an authenticated admin, redirecting to the login page otherwise.
 *
 * `redirect` throws, so control never returns to the caller when unauthenticated
 * and the return type is safely non-nullable.
 */
export async function requireAdmin(
  returnTo?: string,
): Promise<AuthenticatedAdmin> {
  const admin = await getAuthenticatedAdmin();

  if (!admin) {
    const target = returnTo
      ? `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(returnTo)}`
      : ADMIN_LOGIN_PATH;
    redirect(target);
  }

  return admin;
}

/** Requires a specific permission; used by later phases to gate features. */
export async function requirePermission(
  permission: Permission,
  returnTo?: string,
): Promise<AuthenticatedAdmin> {
  const admin = await requireAdmin(returnTo);

  if (!can(admin.role, permission)) {
    redirect(`${ADMIN_HOME_PATH}?denied=${encodeURIComponent(permission)}`);
  }

  return admin;
}

/** Redirects away from pages that only make sense when signed out. */
export async function redirectIfAuthenticated(to: string = ADMIN_HOME_PATH) {
  const admin = await getAuthenticatedAdmin();
  if (admin) {
    redirect(to);
  }
}
