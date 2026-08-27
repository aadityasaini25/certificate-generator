import type { Metadata } from "next";
import { Suspense } from "react";

import { Pagination } from "@/components/admin/pagination";
import { SubmissionFilters } from "@/components/admin/submission-filters";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import { Card, CardBody, LoadingState } from "@/components/ui";
import { can } from "@/lib/auth/authorize";
import { requirePermission } from "@/lib/auth/dal";
import { SUBMISSION_STATUS_ORDER } from "@/lib/constants";
import { listSubmissions } from "@/lib/submissions/queries";
import type { SubmissionStatus } from "@/types";

export const metadata: Metadata = {
  title: "Submissions",
  robots: { index: false, follow: false },
};

/** Only a value the enum actually contains becomes a filter. */
function parseStatus(value: string | undefined): SubmissionStatus | null {
  if (!value) return null;
  return (SUBMISSION_STATUS_ORDER as readonly string[]).includes(value)
    ? (value as SubmissionStatus)
    : null;
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await requirePermission("submission:read", "/admin/submissions");

  const { q, status, page } = await searchParams;
  const activeStatus = parseStatus(status);
  const search = q?.trim() ?? "";

  // Paging and filtering both happen in MySQL; only one page of rows is loaded.
  const result = await listSubmissions({
    search,
    status: activeStatus,
    page: parsePage(page),
  });

  const baseParams: Record<string, string> = {};
  if (search) baseParams.q = search;
  if (activeStatus) baseParams.status = activeStatus;

  const isFiltered = Boolean(search || activeStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Submissions
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {result.total} {result.total === 1 ? "request" : "requests"}
          {isFiltered ? " matching your filters" : " in total"}.
        </p>
      </div>

      <Suspense fallback={<LoadingState label="Loading filters…" />}>
        <SubmissionFilters />
      </Suspense>

      <Card>
        <CardBody className="px-0 py-0 sm:px-0">
          <SubmissionsTable
            items={result.items}
            canEdit={can(admin.role, "submission:edit")}
            emptyTitle={
              isFiltered ? "No matching submissions" : "No submissions yet"
            }
            emptyDescription={
              isFiltered
                ? "Try a different search term or clear the filters."
                : "Requests submitted through the public form will appear here."
            }
          />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            baseParams={baseParams}
          />
        </CardBody>
      </Card>
    </div>
  );
}
