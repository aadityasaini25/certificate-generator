import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Shared metadata for everything under /admin.
 *
 * Deliberately does NOT perform the authentication check: /admin/login lives
 * under this path and must stay reachable while signed out. The guard belongs
 * to the (protected) segment's layout and to each protected page.
 */
export const metadata: Metadata = {
  // The admin panel must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
