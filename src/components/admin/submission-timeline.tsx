import { ArrowRight, MessageSquare } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { SubmissionDetail } from "@/lib/submissions/queries";

/**
 * Audit trail.
 *
 * Built entirely from SubmissionRemark rows — the same table stores plain
 * remarks and status changes, distinguished by whether fromStatus/toStatus are
 * set. No separate history table exists or is needed.
 */

export function SubmissionTimeline({
  remarks,
}: {
  remarks: SubmissionDetail["remarks"];
}) {
  if (remarks.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Status changes and remarks will appear here."
        icon={<MessageSquare aria-hidden className="size-5" />}
      />
    );
  }

  return (
    <ol className="relative space-y-0 px-5 py-2 sm:px-6">
      {remarks.map((remark, index) => {
        const isStatusChange = Boolean(remark.toStatus);
        const isLast = index === remarks.length - 1;

        return (
          <li key={remark.id} className="relative flex gap-4 pb-6 last:pb-2">
            {/* Connector line between entries */}
            {!isLast ? (
              <span
                aria-hidden
                className="absolute left-[11px] top-6 h-full w-px bg-line"
              />
            ) : null}

            <span
              aria-hidden
              className={
                isStatusChange
                  ? "relative mt-1 size-[22px] shrink-0 rounded-full border-2 border-brand-600 bg-surface"
                  : "relative mt-1 size-[22px] shrink-0 rounded-full border-2 border-line-strong bg-surface"
              }
            />

            <div className="min-w-0 flex-1 pt-0.5">
              {isStatusChange ? (
                <div className="flex flex-wrap items-center gap-2">
                  {remark.fromStatus ? (
                    <>
                      <StatusBadge status={remark.fromStatus} />
                      <ArrowRight aria-hidden className="size-3.5 text-ink-muted" />
                    </>
                  ) : null}
                  {remark.toStatus ? <StatusBadge status={remark.toStatus} /> : null}
                </div>
              ) : (
                <p className="text-sm font-medium text-ink">Remark</p>
              )}

              <p className="mt-1.5 text-sm text-ink-soft whitespace-pre-line">
                {remark.message}
              </p>

              <p className="mt-1.5 text-xs text-ink-muted">
                {remark.admin?.name ?? "System"}
                {" · "}
                {formatDateTime(remark.createdAt)}
                {remark.isInternal ? " · Internal" : " · Visible to applicant"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
