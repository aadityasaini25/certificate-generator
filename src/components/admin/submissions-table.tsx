import Link from "next/link";
import { Eye, FileText, Pencil } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { SubmissionListItem } from "@/lib/submissions/queries";

/**
 * Submission list.
 *
 * A real <table> on desktop for scannability; the same rows become stacked
 * cards below `md` so the list stays usable on a phone without horizontal
 * scrolling. Both renderings come from the same data — there is no duplicated
 * source of truth, only two presentations.
 */

export interface SubmissionsTableProps {
  items: readonly SubmissionListItem[];
  /** Whether to render the Edit action; decided server-side by permission. */
  canEdit: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

function Actions({ id, canEdit }: { id: string; canEdit: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/submissions/${id}`}
        className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
      >
        <Eye aria-hidden className="size-4" />
        View
      </Link>
      {canEdit ? (
        <Link
          href={`/admin/submissions/${id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <Pencil aria-hidden className="size-4" />
          Edit
        </Link>
      ) : null}
    </div>
  );
}

export function SubmissionsTable({
  items,
  canEdit,
  emptyTitle,
  emptyDescription,
}: SubmissionsTableProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Certificate submissions</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                Applicant
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                Company
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                Location
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                Submitted
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-ink-muted">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-line last:border-0 hover:bg-surface-muted"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-ink">{item.applicantName}</div>
                  <div className="text-ink-muted">{item.applicantEmail}</div>
                  <div className="mt-0.5 font-mono text-xs text-ink-muted">
                    {item.referenceNo}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-ink-soft">
                  {item.companyName ?? "—"}
                </td>
                <td className="px-4 py-3 align-top text-ink-soft">
                  {item.location ?? "—"}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-ink-soft">
                  {formatDate(item.submittedAt)}
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 align-top">
                  <Actions id={item.id} canEdit={canEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-line md:hidden">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{item.applicantName}</p>
                <p className="truncate text-sm text-ink-muted">
                  {item.applicantEmail}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">Company</dt>
                <dd className="text-ink-soft">{item.companyName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Location</dt>
                <dd className="text-ink-soft">{item.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Submitted</dt>
                <dd className="text-ink-soft">{formatDate(item.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Documents</dt>
                <dd className="inline-flex items-center gap-1 text-ink-soft">
                  <FileText aria-hidden className="size-3.5" />
                  {item._count.documents}
                </dd>
              </div>
            </dl>

            <p className="mt-2 font-mono text-xs text-ink-muted">
              {item.referenceNo}
            </p>

            <div className="mt-2">
              <Actions id={item.id} canEdit={canEdit} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
