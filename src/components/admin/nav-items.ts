import type { Permission } from "@/lib/auth/authorize";

/**
 * Admin navigation definitions.
 *
 * Deliberately a plain module, NOT a Client Component. A `"use client"` file
 * exports client *references*, not values, so a Server Component importing an
 * array from one receives a proxy rather than the array. Keeping the data here
 * lets the server filter the list and the client render it.
 */

/** Icon keys resolved to components inside the client nav. */
export type NavIcon = "dashboard" | "submissions" | "certificates";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Omit for items every signed-in admin may see. */
  permission?: Permission;
}

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  {
    href: "/admin/submissions",
    label: "Submissions",
    icon: "submissions",
    permission: "submission:read",
  },
];
