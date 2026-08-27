"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import type { NavIcon, NavItem } from "./nav-items";

/**
 * Admin navigation.
 *
 * Receives an already-filtered list from the server, so a link is never sent to
 * the browser for someone who lacks the permission to use it.
 */

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  submissions: FileText,
  certificates: ShieldCheck,
};

export function AdminNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-ink-soft hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
