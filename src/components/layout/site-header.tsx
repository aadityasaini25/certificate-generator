"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";

import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Public site header.
 *
 * "Check Request Status" and "Verify Certificate" are deliberately separate
 * entries: one tracks a submitted request by its reference ID, the other
 * verifies an issued certificate by its certificate number. They are different
 * features with different inputs, and the navigation should not imply
 * otherwise.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/request", label: "Submit Request" },
  { href: "/status", label: "Check Request Status" },
  { href: "/verify", label: "Verify Certificate" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-ink"
            aria-label={`${APP.name} home`}
          >
            <span className="flex size-9 items-center justify-center rounded-control bg-brand-600 text-white">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                {APP.name}
              </span>
              <span className="hidden text-xs text-ink-muted sm:block">
                {APP.tagline}
              </span>
            </span>
          </Link>

          {/* Desktop */}
          <nav
            aria-label="Main"
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "rounded-control px-3 py-2 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="ml-1 rounded-control border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              Admin sign in
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="inline-flex size-10 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            {isOpen ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>
        </div>

        {/* Mobile */}
        {isOpen ? (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="border-t border-line py-2 lg:hidden"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "block rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/admin/login"
              onClick={() => setIsOpen(false)}
              className="mt-1 block rounded-control px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              Admin sign in
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
