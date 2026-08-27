import Link from "next/link";

import { cn } from "@/lib/utils";
import { SUBMISSION_STATUS_META, type StatusTone } from "@/lib/constants";
import type { SubmissionStatus } from "@/types";

/**
 * Dashboard summary tile.
 *
 * Every tile links to the submission list pre-filtered to what it counts, so a
 * number is always one click from the rows behind it.
 */

const TONE_ACCENT: Record<StatusTone | "total", string> = {
  total: "bg-brand-50 text-brand-700",
  neutral: "bg-status-neutral-bg text-status-neutral",
  info: "bg-status-info-bg text-status-info",
  success: "bg-status-success-bg text-status-success",
  danger: "bg-status-danger-bg text-status-danger",
  accent: "bg-status-accent-bg text-status-accent",
};

export interface StatCardProps {
  label: string;
  value: number;
  href: string;
  tone: StatusTone | "total";
}

export function StatCard({ label, value, href, tone }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <span
          aria-hidden
          className={cn("size-2.5 rounded-full", TONE_ACCENT[tone])}
        />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted group-hover:text-brand-700">
        View submissions
      </p>
    </Link>
  );
}

/** Builds the tile set from real counts. */
export function statCardsFrom(
  total: number,
  byStatus: Record<SubmissionStatus, number>,
  order: readonly SubmissionStatus[],
): StatCardProps[] {
  return [
    { label: "Total Submissions", value: total, href: "/admin/submissions", tone: "total" as const },
    ...order.map((status) => ({
      label: SUBMISSION_STATUS_META[status].label,
      value: byStatus[status],
      href: `/admin/submissions?status=${status}`,
      tone: SUBMISSION_STATUS_META[status].tone,
    })),
  ];
}
