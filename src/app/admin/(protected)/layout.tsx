import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Guard for every authenticated admin route.
 *
 * /admin/login sits outside this segment, so it stays reachable while signed
 * out and there is no redirect loop. Pages inside also call `requireAdmin`
 * themselves — a layout alone is not a sufficient security boundary.
 */
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const admin = await requireAdmin();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
