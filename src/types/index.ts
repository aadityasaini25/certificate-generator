/**
 * Shared application types.
 *
 * Database row shapes come from the generated Prisma client and are
 * re-exported here so application code has a single import site and never
 * reaches into `src/generated` directly.
 */

export type {
  Admin,
  Certificate,
  CertificateSubmission,
  SubmissionRemark,
  UploadedDocument,
} from "@/generated/prisma/client";

export { AdminRole, SubmissionStatus } from "@/generated/prisma/enums";

/** Uniform result type for server actions and API handlers. */
export type ActionResult<TData = undefined> =
  | { success: true; data: TData }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Standard shape for paginated admin list endpoints. */
export interface Paginated<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
