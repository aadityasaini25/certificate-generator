import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { EditSubmissionForm } from "@/components/admin/edit-submission-form";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth/dal";
import { getSubmissionDetail } from "@/lib/submissions/queries";
import { isEditable } from "@/lib/submissions/status";
import { submissionIdSchema } from "@/lib/validations/admin";

export const metadata: Metadata = {
  title: "Edit submission",
  robots: { index: false, follow: false },
};

/** Recovers the two name parts for the form's separate fields. */
function nameParts(additionalData: unknown, fullName: string) {
  if (additionalData && typeof additionalData === "object") {
    const data = additionalData as Record<string, unknown>;
    const first = typeof data.firstName === "string" ? data.firstName : null;
    const last = typeof data.lastName === "string" ? data.lastName : null;
    if (first || last) return { firstName: first ?? "", lastName: last ?? "" };
  }
  const [first, ...rest] = fullName.split(" ");
  return { firstName: first ?? "", lastName: rest.join(" ") };
}

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Reaching the edit page at all requires the edit permission — not just the
  // ability to read submissions.
  await requirePermission("submission:edit");

  const { id } = await params;
  const parsedId = submissionIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const submission = await getSubmissionDetail(parsedId.data);
  if (!submission) notFound();

  // A completed submission is locked; send the admin back to the detail view.
  if (!isEditable(submission.status)) {
    redirect(`/admin/submissions/${submission.id}`);
  }

  const { firstName, lastName } = nameParts(
    submission.additionalData,
    submission.applicantName,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
          <li>
            <Link href="/admin/submissions" className="hover:text-ink">
              Submissions
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li>
            <Link
              href={`/admin/submissions/${submission.id}`}
              className="font-mono hover:text-ink"
            >
              {submission.referenceNo}
            </Link>
          </li>
          <ChevronRight aria-hidden className="size-3.5" />
          <li aria-current="page" className="text-ink">
            Edit
          </li>
        </ol>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Edit submission
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Correct applicant details before a decision is made. Uploaded
          documents are not affected.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Submitted information"
          description="Changes are recorded in the submission history."
        />
        <CardBody className="sm:px-8 sm:py-7">
          <EditSubmissionForm
            submissionId={submission.id}
            defaults={{
              firstName,
              lastName,
              email: submission.applicantEmail,
              companyName: submission.companyName ?? "",
              jobTitle: submission.applicantDesignation ?? "",
              location: submission.location ?? "",
              comments: submission.additionalNotes ?? "",
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
