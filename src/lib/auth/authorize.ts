import type { AdminRole } from "@/types";

/**
 * Role-based authorisation.
 *
 * Authorisation is expressed as permissions, not as role checks scattered
 * through the codebase. Call sites ask "may this admin do X?" rather than
 * "is this admin a SUPER_ADMIN?", so adding or re-scoping a role means editing
 * this one table.
 *
 * Safe to import from Client Components — it is pure data with no secrets.
 */

export const PERMISSIONS = [
  "submission:read",
  "submission:edit",
  "submission:decide",
  "certificate:generate",
  "admin:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Which permissions each role carries.
 *
 * Phase 3 only needs authentication, but the map is declared in full so later
 * phases can gate features without inventing a second mechanism.
 */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    "submission:read",
    "submission:edit",
    "submission:decide",
    "certificate:generate",
    "admin:manage",
  ],
  ADMIN: [
    "submission:read",
    "submission:edit",
    "submission:decide",
    "certificate:generate",
  ],
  REVIEWER: ["submission:read"],
};

/** Human-readable role labels for the UI. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super administrator",
  ADMIN: "Administrator",
  REVIEWER: "Reviewer",
};

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAll(
  role: AdminRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => can(role, permission));
}

export function canAny(
  role: AdminRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(role, permission));
}
