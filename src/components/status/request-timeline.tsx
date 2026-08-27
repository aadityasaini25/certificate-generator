import { Check, Circle, Dot, X } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import type { TimelineStage } from "@/lib/submissions/status-tracking";

/**
 * Public progress timeline.
 *
 * Reflects the stages a request has actually reached. A stage with no recorded
 * date shows none rather than an invented one, and a stage that has not been
 * reached is never drawn as complete.
 */

export function RequestTimeline({
  stages,
  isRejected,
}: {
  stages: readonly TimelineStage[];
  isRejected: boolean;
}) {
  return (
    <ol className="space-y-0">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const isFailure = isRejected && stage.key === "rejected";

        return (
          <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[13px] top-7 h-full w-0.5",
                  stage.state === "done" ? "bg-brand-500" : "bg-line",
                )}
              />
            ) : null}

            <span
              aria-hidden
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                isFailure &&
                  "border-status-danger bg-status-danger text-white",
                !isFailure &&
                  stage.state === "done" &&
                  "border-brand-500 bg-brand-500 text-white",
                !isFailure &&
                  stage.state === "current" &&
                  "border-brand-500 bg-surface text-brand-600",
                stage.state === "upcoming" &&
                  "border-line-strong bg-surface text-ink-muted",
              )}
            >
              {isFailure ? (
                <X className="size-3.5" strokeWidth={3} />
              ) : stage.state === "done" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : stage.state === "current" ? (
                <Dot className="size-6" strokeWidth={6} />
              ) : (
                <Circle className="size-2.5" strokeWidth={3} />
              )}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  stage.state === "upcoming" ? "text-ink-muted" : "text-ink",
                )}
              >
                {stage.label}
              </p>

              {stage.at ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {formatDate(stage.at)}
                </p>
              ) : stage.state === "current" ? (
                <p className="mt-0.5 text-xs text-ink-muted">In progress</p>
              ) : null}

              {stage.state === "current" ? (
                <span className="sr-only">Current stage</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
