import "server-only";

import { prisma } from "@/lib/prisma";
import { SUBMISSION_STATUS_ORDER } from "@/lib/constants";
import type { SubmissionStatus } from "@/types";

/**
 * Read queries for the admin panel.
 *
 * All counting, searching, filtering and paging happens in MySQL. The browser
 * only ever receives the page it is displaying, so the dataset can grow without
 * the admin panel getting slower or heavier.
 *
 * Callers must have already established authorisation — these functions do not
 * check permissions themselves, which is why the module is server-only and is
 * always reached through a route that called `requirePermission` first.
 */

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type StatusCounts = Record<SubmissionStatus, number>;

export interface DashboardStats {
  total: number;
  byStatus: StatusCounts;
}

/** Real counts, aggregated by the database rather than by loading rows. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [total, grouped] = await Promise.all([
    prisma.certificateSubmission.count(),
    prisma.certificateSubmission.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // Start every status at zero so absent statuses still render as 0.
  const byStatus = Object.fromEntries(
    SUBMISSION_STATUS_ORDER.map((status) => [status, 0]),
  ) as StatusCounts;

  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }

  return { total, byStatus };
}

/** Columns needed by the list and dashboard tables — nothing more. */
const LIST_SELECT = {
  id: true,
  referenceNo: true,
  applicantName: true,
  applicantEmail: true,
  companyName: true,
  location: true,
  status: true,
  submittedAt: true,
  _count: { select: { documents: true } },
} as const;

export type SubmissionListItem = Awaited<
  ReturnType<typeof prisma.certificateSubmission.findMany<{ select: typeof LIST_SELECT }>>
>[number];

export interface ListSubmissionsParams {
  search?: string;
  status?: SubmissionStatus | null;
  page?: number;
  pageSize?: number;
}

export interface ListSubmissionsResult {
  items: SubmissionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listSubmissions({
  search,
  status,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ListSubmissionsParams = {}): Promise<ListSubmissionsResult> {
  // Clamp paging so a crafted query string cannot ask for the whole table.
  const safePageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const term = search?.trim();

  const where = {
    ...(status ? { status } : {}),
    ...(term
      ? {
          // The database collation is case-insensitive, so `contains` matches
          // regardless of case without a full scan of decoded rows.
          OR: [
            { applicantName: { contains: term } },
            { applicantEmail: { contains: term } },
            { companyName: { contains: term } },
            { referenceNo: { contains: term } },
          ],
        }
      : {}),
  };

  const total = await prisma.certificateSubmission.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  // If a filter shrinks the result set below the requested page, show the last.
  const safePage = Math.min(Math.max(1, page), totalPages);

  const items = await prisma.certificateSubmission.findMany({
    where,
    select: LIST_SELECT,
    orderBy: { submittedAt: "desc" },
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  });

  return { items, total, page: safePage, pageSize: safePageSize, totalPages };
}

/** Most recent submissions for the dashboard. */
export async function getRecentSubmissions(limit = 5) {
  return prisma.certificateSubmission.findMany({
    select: LIST_SELECT,
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}

/**
 * Full detail for one submission.
 *
 * Returns null for an unknown id rather than throwing, so the caller can render
 * a 404 without leaking whether the id exists.
 */
export async function getSubmissionDetail(id: string) {
  return prisma.certificateSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      referenceNo: true,
      applicantName: true,
      applicantEmail: true,
      applicantPhone: true,
      applicantDesignation: true,
      companyName: true,
      location: true,
      additionalNotes: true,
      additionalData: true,
      declarationAccepted: true,
      declaredBy: true,
      declaredAt: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      reviewedAt: true,
      submitterIp: true,
      reviewedBy: { select: { id: true, name: true, email: true } },
      certificate: {
        select: {
          id: true,
          certificateNo: true,
          issuedAt: true,
          filePath: true,
          revokedAt: true,
          templateKey: true,
          issuedBy: { select: { name: true } },
          // `snapshot` is intentionally not selected: it can be large and the
          // detail page has no need for it.
        },
      },
      documents: {
        select: {
          id: true,
          documentType: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          uploadedAt: true,
          // storagePath is deliberately NOT selected: the browser never needs
          // it, and documents are fetched by id through a guarded route.
        },
        orderBy: { uploadedAt: "asc" },
      },
      remarks: {
        select: {
          id: true,
          message: true,
          fromStatus: true,
          toStatus: true,
          isInternal: true,
          createdAt: true,
          admin: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type SubmissionDetail = NonNullable<
  Awaited<ReturnType<typeof getSubmissionDetail>>
>;
