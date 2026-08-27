import type { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABELS, can } from "@/lib/auth/authorize";
import type { AuthenticatedAdmin } from "@/lib/auth/session";
import { APP } from "@/lib/constants";

import { AdminNav } from "./admin-nav";
import { ADMIN_NAV_ITEMS } from "./nav-items";

/**
 * Layout shell for the admin panel.
 *
 * Header, navigation, sign-out and a content slot. Later phases fill the
 * content area and add navigation entries; the shell itself should not need
 * to change.
 */

export interface AdminShellProps {
  admin: AuthenticatedAdmin;
  children: ReactNode;
}

export function AdminShell({ admin, children }: AdminShellProps) {
  // Filter navigation server-side so links the admin cannot use are never
  // sent to the browser.
  const navItems = ADMIN_NAV_ITEMS.filter(
    (item) => !item.permission || can(admin.role, item.permission),
  );

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-control bg-brand-600 text-white">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink">{APP.name}</p>
              <p className="text-xs text-ink-muted">Admin panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{admin.name}</p>
              <p className="text-xs text-ink-muted">
                {ROLE_LABELS[admin.role]}
              </p>
            </div>

            {/* A form post, so signing out cannot be triggered by a GET
                request from an image tag or a prefetch. */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="border-b border-line bg-surface px-4 py-4 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-3 lg:py-6">
          <AdminNav items={navItems} />
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
