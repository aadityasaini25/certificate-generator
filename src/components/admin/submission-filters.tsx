"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui";
import { SUBMISSION_STATUS_META, SUBMISSION_STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Search and status filters.
 *
 * State lives in the URL, not in component state, so a filtered view can be
 * bookmarked, shared and restored on refresh — and the server does the actual
 * filtering from those same query parameters.
 */

export function SubmissionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Any change to the query invalidates the current page number.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `/admin/submissions?${query}` : "/admin/submissions");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    apply({
      q: typeof value === "string" ? value.trim() : "",
      status: currentStatus,
    });
  }

  const hasFilters = Boolean(currentSearch || currentStatus);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          />
          {/* Uncontrolled, re-keyed by the URL: navigation (e.g. Clear)
              remounts it with the right value, so no state needs syncing. */}
          <input
            key={currentSearch}
            name="q"
            type="search"
            defaultValue={currentSearch}
            placeholder="Search name, email, company or reference"
            aria-label="Search submissions"
            className="field-control pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => apply({ q: "", status: "" })}
            leadingIcon={<X aria-hidden className="size-4" />}
          >
            Clear
          </Button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <FilterChip
          label="All"
          isActive={currentStatus === ""}
          onClick={() => apply({ q: currentSearch, status: "" })}
        />
        {SUBMISSION_STATUS_ORDER.map((status) => (
          <FilterChip
            key={status}
            label={SUBMISSION_STATUS_META[status].label}
            isActive={currentStatus === status}
            onClick={() => apply({ q: currentSearch, status })}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
