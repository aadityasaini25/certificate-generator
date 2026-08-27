import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil } from "lucide-react";

import { CertificatePanel } from "@/components/admin/certificate-panel";
import { DocumentList } from "@/components/admin/document-list";
import { RemarkForm } from "@/components/admin/remark-form";
import { StatusActions } from "@/components/admin/status-actions";
import { SubmissionTimeline } from "@/components/admin/submission-timeline";
import {
  Card,
  CardBody,
  CardHeader,
  StatusBadge,
  buttonClasses,
} from "@/components/ui";
import { can } from "@/lib/auth/authorize";
import { requirePermission } from "@/lib/auth/dal";
import { getSubmissionDetail } from "@/lib/submissions/queries";
import { isEditable, nextStatuses } from "@/lib/submissions/status";
import { formatDateTime } from "@/lib/utils";
import { submissionIdSchema } from "@/lib/validations/admin";

export const metadata: Metadata = {
  title: "Submission",
  robots: { index: false, follow: false },
};

/** Reads the first/last name the applicant originally typed, if recorded. */
function nameParts(
  additionalData: unknown,
  fallbackFullName: string,
): { firstName: string; lastName: string } {
  if (additionalData && typeof additionalData === "object") {
    const data = additionalData as Record<string, unknown>;
    const first = typeof data.firstName === "string" ? data.firstName : null;
    const last = typeof data.lastName === "string" ? data.lastName : null;
    if (first || last) {
      return { firstName: first ?? "—", lastName: last ?? "—" };
    }
  }
  // Older or externally created rows may only have the combined name.
  const [first, ...rest] = fallbackFullName.split(" ");
  return { firstName: first || "—", lastName: rest.join(" ") || "—" };
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-1 font-mono text-sm break-all text-ink"
            : "mt-1 text-sm text-ink"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("submission:read");

  const { id } = await params;

  // Never hand a raw route parameter to the database.
  const parsedId = submissionIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const submission = await getSubmissionDetail(parsedId.data);
  if (!submission) notFound();

  const { firstName, lastName } = nameParts(
    submission.additionalData,
    submission.applicantName,
  );

  const canEdit = can(admin.role, "submission:edit");
  const canDecide = can(admin.role, "submission:decide");
  const editable = isEditable(submission.status);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
          <li>
            <Link href="/admin" className="hover:text-ink">
              Dashboard
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li>
            <Link href="/admin/submissions" className="hover:text-ink">
              Submissions
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li aria-current="page" className="font-mono text-ink">
            {submission.referenceNo}
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {submission.applicantName}
            </h1>
            <StatusBadge status={submission.status} />
          </div>
          <p className="mt-1.5 font-mono text-sm text-ink-muted">
            {submission.referenceNo}
          </p>
        </div>

        {canEdit && editable ? (
          <Link
            href={`/admin/submissions/${submission.id}/edit`}
            className={buttonClasses({ variant: "secondary" })}
          >
            <Pencil aria-hidden className="mr-2 size-4" />
            Edit submission
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Applicant Information" />
            <CardBody>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="First Name" value={firstName} />
                <Detail label="Last Name" value={lastName} />
                <Detail label="Email" value={submission.applicantEmail} />
                <Detail label="Phone" value={submission.applicantPhone} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Professional Information" />
            <CardBody>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="Company Name" value={submission.companyName} />
                <Detail
                  label="Job Title"
                  value={submission.applicantDesignation}
                />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Request Information" />
            <CardBody>
              <dl className="space-y-4">
                <Detail label="Location" value={submission.location} />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Comments
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm text-ink">
                    {submission.additionalNotes || "—"}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Documents"
              description={`${submission.documents.length} file${
                submission.documents.length === 1 ? "" : "s"
              } attached.`}
            />
            <CardBody className="px-0 py-0 sm:px-0">
              <DocumentList documents={submission.documents} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="History"
              description="Status changes and remarks, oldest first."
            />
            <CardBody className="px-0 py-0 sm:px-0">
              <SubmissionTimeline remarks={submission.remarks} />
            </CardBody>
          </Card>

          {canEdit ? (
            <Card>
              <CardHeader title="Add Remark" />
              <CardBody>
                <RemarkForm submissionId={submission.id} />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Certificate" />
            <CardBody>
              <CertificatePanel
                submissionId={submission.id}
                status={submission.status}
                canGenerate={can(admin.role, "certificate:generate")}
                certificate={
                  submission.certificate
                    ? {
                        id: submission.certificate.id,
                        certificateNo: submission.certificate.certificateNo,
                        issuedAt: submission.certificate.issuedAt.toISOString(),
                        issuedByName:
                          submission.certificate.issuedBy?.name ?? null,
                        hasFile: Boolean(submission.certificate.filePath),
                        revokedAt:
                          submission.certificate.revokedAt?.toISOString() ??
                          null,
                      }
                    : null
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <CardBody>
              <StatusActions
                submissionId={submission.id}
                currentStatus={submission.status}
                availableStatuses={nextStatuses(submission.status)}
                canDecide={canDecide}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Submission Metadata" />
            <CardBody>
              <dl className="space-y-4">
                <Detail label="Reference" value={submission.referenceNo} mono />
                <Detail label="Submission ID" value={submission.id} mono />
                <Detail
                  label="Submitted"
                  value={formatDateTime(submission.submittedAt)}
                />
                <Detail
                  label="Last updated"
                  value={formatDateTime(submission.updatedAt)}
                />
                <Detail
                  label="Reviewed"
                  value={
                    submission.reviewedAt
                      ? formatDateTime(submission.reviewedAt)
                      : null
                  }
                />
                <Detail
                  label="Reviewed by"
                  value={submission.reviewedBy?.name}
                />
                <Detail
                  label="Consent given"
                  value={
                    submission.declarationAccepted
                      ? `Yes — ${submission.declaredBy ?? "applicant"}${
                          submission.declaredAt
                            ? ` on ${formatDateTime(submission.declaredAt)}`
                            : ""
                        }`
                      : "No"
                  }
                />
                {/* Retained for abuse tracing; visible to admins only. */}
                <Detail label="Submitted from" value={submission.submitterIp} mono />
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
