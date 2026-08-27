import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, BadgeCheck, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RequestTimeline } from "@/components/status/request-timeline";
import { StatusForm } from "@/components/status/status-form";
import {
  Card,
  CardBody,
  CardHeader,
  StatusBadge,
  buttonClasses,
} from "@/components/ui";
import {
  PUBLIC_AWAITING_CERTIFICATE_MESSAGE,
  PUBLIC_STATUS_MESSAGES,
} from "@/lib/constants";
import { publicConfig } from "@/lib/public-config";
import { lookupRequestStatus } from "@/lib/submissions/status-tracking";
import { formatDate } from "@/lib/utils";
import {
  REQUEST_NOT_FOUND_MESSAGE,
  referenceSchema,
} from "@/lib/validations/status";

/**
 * Public request status result.
 *
 * A plain GET on its own URL so an applicant can bookmark or revisit it. The
 * page is noindex and sends no referrer, so a reference ID is not handed to
 * search engines or to any site linked from here.
 */

export const metadata: Metadata = {
  title: "Request status",
  robots: { index: false, follow: false },
  // A reference ID in the URL must not leak to third parties via Referer.
  referrer: "no-referrer",
};

// Resolved per request: an admin changing the status must be reflected at once.
export const dynamic = "force-dynamic";

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
      <Card>
        <CardBody className="sm:px-7 sm:py-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
              <AlertCircle aria-hidden className="size-6" />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-ink">
              Request Not Found
            </h1>
            <p className="mt-2 max-w-sm text-sm text-ink-soft">
              {REQUEST_NOT_FOUND_MESSAGE}
            </p>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <p className="mb-3 text-sm font-medium text-ink">
              Try another reference ID
            </p>
            <StatusForm />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default async function RequestStatusPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  // Re-validated server-side; the form's check is only a convenience.
  const parsed = referenceSchema.safeParse(decodeURIComponent(reference));

  // A malformed reference and an unknown one render identically, so the
  // response cannot be used to discover which references exist.
  if (!parsed.success) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <NotFound />
        </main>
        <SiteFooter />
      </>
    );
  }

  const request = await lookupRequestStatus(
    parsed.data,
    publicConfig.statusApplicantName,
  );

  if (!request) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <NotFound />
        </main>
        <SiteFooter />
      </>
    );
  }

  const isRejected = request.status === "REJECTED";

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Request Status
            </h1>
            <p className="mt-2 font-mono text-lg text-ink-soft">
              {request.reference}
            </p>
          </div>

          <Card>
            <CardHeader
              title="Current status"
              action={<StatusBadge status={request.status} />}
            />
            <CardBody>
              <p className="text-sm text-ink-soft">
                {request.awaitingCertificate
                  ? PUBLIC_AWAITING_CERTIFICATE_MESSAGE
                  : PUBLIC_STATUS_MESSAGES[request.status]}
              </p>

              <dl className="mt-5 grid gap-x-8 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Reference ID
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-ink">
                    {request.reference}
                  </dd>
                </div>
                {request.applicantName ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Applicant
                    </dt>
                    <dd className="mt-1 text-sm text-ink">
                      {request.applicantName}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Submitted
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatDate(request.submittedAt)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card className="mt-5">
            <CardHeader
              title="Progress"
              description="The stages your request has reached so far."
            />
            <CardBody>
              <RequestTimeline
                stages={request.timeline}
                isRejected={isRejected}
              />
            </CardBody>
          </Card>

          {request.certificateNumber ? (
            <Card className="mt-5">
              <CardHeader
                title="Certificate Available"
                description="Your certificate has been issued."
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-medium text-status-success">
                    <BadgeCheck aria-hidden className="size-3.5" />
                    Issued
                  </span>
                }
              />
              <CardBody>
                <p className="text-sm text-ink-soft">
                  Certificate number{" "}
                  <span className="font-mono font-medium text-ink">
                    {request.certificateNumber}
                  </span>
                  . Use the verification page to view and download it.
                </p>
                <div className="mt-4">
                  <Link
                    href={`/verify/${encodeURIComponent(
                      request.certificateNumber,
                    )}`}
                    className={buttonClasses({})}
                  >
                    <ShieldCheck aria-hidden className="mr-2 size-4" />
                    Verify Certificate
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <p className="mt-6 text-center text-sm">
            <Link
              href="/status"
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Check another request
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
