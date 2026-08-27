import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Server-side admin sessions.
 *
 * The cookie carries a single opaque random token and nothing else — no admin
 * id, no role, no email. Everything about the session is looked up server-side,
 * so the browser holds no information worth forging and nothing sensitive is
 * exposed if the cookie is read.
 *
 * The database stores only an HMAC of the token, keyed with AUTH_SECRET. Read
 * access to `admin_sessions` therefore does not let anyone impersonate an
 * administrator, and rotating AUTH_SECRET invalidates every existing session.
 */

export const SESSION_COOKIE_NAME = "admin_session";

/** 256 bits of entropy — far beyond guessing range. */
const TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return createHmac("sha256", env.auth.secret).update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Issues a new session for an admin and sets the cookie.
 *
 * Returns the expiry so callers can log it; the raw token never leaves this
 * module except via the cookie.
 */
export async function createSession(
  adminId: string,
  context: SessionContext = {},
): Promise<{ expiresAt: Date }> {
  const token = createToken();
  const expiresAt = new Date(
    Date.now() + env.auth.sessionMaxAgeSeconds * 1000,
  );

  await prisma.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      adminId,
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent?.slice(0, 500) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    // Unreadable from JavaScript, so an XSS bug cannot steal the session.
    httpOnly: true,
    // Sent over HTTPS only outside development.
    secure: env.isProduction,
    // Blocks the cookie on cross-site POSTs (CSRF) while keeping normal
    // top-level navigation to the admin panel working.
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { expiresAt };
}

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "REVIEWER";
  sessionId: string;
}

/**
 * Resolves the current session, or null.
 *
 * Returns null — never throws — for every failure mode: no cookie, unknown
 * token, expired session, or an account that has since been deactivated.
 * Expired and orphaned rows are deleted as they are encountered.
 */
export async function getCurrentSession(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      tokenHash: true,
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          // passwordHash is deliberately never selected.
        },
      },
    },
  });

  if (!session) return null;

  // Constant-time confirmation that the stored hash matches the presented
  // token. findUnique already matched it; this guards against any future
  // change to the lookup that might introduce a comparison shortcut.
  const expected = Buffer.from(session.tokenHash, "utf8");
  const actual = Buffer.from(hashToken(token), "utf8");
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  // A deactivated admin loses access immediately, without needing to be
  // logged out explicitly.
  if (!session.admin.isActive) {
    await prisma.adminSession
      .deleteMany({ where: { adminId: session.admin.id } })
      .catch(() => undefined);
    return null;
  }

  return {
    id: session.admin.id,
    email: session.admin.email,
    name: session.admin.name,
    role: session.admin.role,
    sessionId: session.id,
  };
}

/**
 * Ends the current session.
 *
 * Deletes the row first so the session is dead server-side even if the browser
 * ignores the cookie removal, then clears the cookie.
 */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.adminSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Revokes every session belonging to an admin. */
export async function destroyAllSessionsForAdmin(
  adminId: string,
): Promise<number> {
  const { count } = await prisma.adminSession.deleteMany({ where: { adminId } });
  return count;
}

/** Housekeeping for expired rows; safe to call from a scheduled job later. */
export async function purgeExpiredSessions(): Promise<number> {
  const { count } = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
