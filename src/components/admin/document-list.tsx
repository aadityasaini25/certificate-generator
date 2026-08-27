import { Download, ExternalLink, FileArchive, FileText } from "lucide-react";

import { EmptyState } from "@/components/ui";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import type { SubmissionDetail } from "@/lib/submissions/queries";

/**
 * Uploaded documents.
 *
 * Links address documents by id only; the stored path never reaches the
 * browser. PDFs may open in a new tab (served sandboxed), archives download.
 */

export function DocumentList({
  documents,
}: {
  documents: SubmissionDetail["documents"];
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents"
        description="This submission has no attached documents."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {documents.map((document) => {
        const isPdf = document.mimeType === "application/pdf";
        const Icon = isPdf ? FileText : FileArchive;
        const href = `/api/admin/documents/${document.id}`;

        return (
          <li
            key={document.id}
            className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-brand-700">
              <Icon aria-hidden className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {document.originalName}
              </p>
              <p className="text-xs text-ink-muted">
                {isPdf ? "PDF" : "ZIP archive"}
                {" · "}
                {formatFileSize(document.sizeBytes)}
                {" · "}
                Uploaded {formatDateTime(document.uploadedAt)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {isPdf ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
                >
                  <ExternalLink aria-hidden className="size-4" />
                  View
                </a>
              ) : null}
              <a
                href={`${href}?download=1`}
                className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <Download aria-hidden className="size-4" />
                Download
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
