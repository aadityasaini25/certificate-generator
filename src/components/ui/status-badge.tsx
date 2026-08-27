import { cn } from "@/lib/utils";
import { SUBMISSION_STATUS_META, type StatusTone } from "@/lib/constants";
import type { SubmissionStatus } from "@/types";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-status-neutral-bg text-status-neutral",
  info: "bg-status-info-bg text-status-info",
  success: "bg-status-success-bg text-status-success",
  danger: "bg-status-danger-bg text-status-danger",
  accent: "bg-status-accent-bg text-status-accent",
};

export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus;
  className?: string;
}) {
  const meta = SUBMISSION_STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[meta.tone],
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-current opacity-70"
      />
      {meta.label}
    </span>
  );
}
