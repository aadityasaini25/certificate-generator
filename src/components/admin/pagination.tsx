import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Server-rendered pagination.
 *
 * Plain links, so paging works without JavaScript and each page has its own
 * shareable URL.
 */

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Existing query parameters to preserve, e.g. search and status. */
  baseParams: Record<string, string>;
}

function hrefFor(page: number, baseParams: Record<string, string>) {
  const params = new URLSearchParams(baseParams);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const query = params.toString();
  return query ? `/admin/submissions?${query}` : "/admin/submissions";
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  baseParams,
}: PaginationProps) {
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const linkClasses =
    "inline-flex items-center gap-1 rounded-control border border-line-strong px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
    >
      <p className="text-sm text-ink-muted">
        Showing <span className="font-medium text-ink">{first}</span>–
        <span className="font-medium text-ink">{last}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={hrefFor(page - 1, baseParams)} className={cn(linkClasses, "text-ink-soft hover:bg-surface-muted hover:text-ink")} rel="prev">
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </Link>
          ) : (
            <span className={cn(linkClasses, "cursor-not-allowed text-ink-muted opacity-55")}>
              <ChevronLeft aria-hidden className="size-4" />
              Previous
            </span>
          )}

          <span className="px-1 text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={hrefFor(page + 1, baseParams)} className={cn(linkClasses, "text-ink-soft hover:bg-surface-muted hover:text-ink")} rel="next">
              Next
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <span className={cn(linkClasses, "cursor-not-allowed text-ink-muted opacity-55")}>
              Next
              <ChevronRight aria-hidden className="size-4" />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
