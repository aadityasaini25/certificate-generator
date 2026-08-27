import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  Download,
  ExternalLink,
  ShieldOff,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { VerifyForm } from "@/components/verify/verify-form";
import { Card, CardBody, CardHeader, buttonClasses } from "@/components/ui";
import { verifyCertificateNumber } from "@/lib/certificates/verify";
import { formatDate } from "@/lib/utils";
import {
  CERTIFICATE_NOT_FOUND_MESSAGE,
  certificateNumberSchema,
} from "@/lib/validations/verify";

/**
 * Verification result.
 *
 * A plain GET on a shareable, bookmarkable URL — the same URL a QR code will
 * encode in a later phase. Everything shown comes from the certificate's frozen
 * snapshot, so the result reflects what was issued rather than the current
 * state of the submission behind it.
 */

export const metadata: Metadata = {
  title: "Certificate verification",
  robots: {
    // Individual results should not be indexed: they concern named people.
    index: false,
    follow: false,
  },
};

// Always resolved at request time; a revoked certificate must stop verifying
// immediately rather than being served from a cached page.
export const dynamic = "force-dynamic";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function NotVerified({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
      <Card>
        <CardBody className="sm:px-7 sm:py-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-status-danger-bg text-status-danger">
              <AlertCircle aria-hidden className="size-6" />
            </span>
            <h1 className="mt-4 text-xl font-semibold text-ink">{heading}</h1>
            <p className="mt-2 max-w-sm text-sm text-ink-soft">{body}</p>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <p className="mb-3 text-sm font-medium text-ink">
              Try another certificate number
            </p>
            <VerifyForm />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default async function VerificationResultPage({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = await params;

  // Re-validated server-side; the client form's check is only a convenience.
  const parsed = certificateNumberSchema.safeParse(
    decodeURIComponent(certificateNumber),
  );

  // A malformed number and an unknown one produce the identical page, so the
  // response cannot be used to probe which numbers exist.
  if (!parsed.success) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <NotVerified
            heading="Certificate not found"
            body={CERTIFICATE_NOT_FOUND_MESSAGE}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  const result = await verifyCertificateNumber(parsed.data);

  if (result.outcome === "NOT_FOUND") {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <NotVerified
            heading="Certificate not found"
            body={CERTIFICATE_NOT_FOUND_MESSAGE}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  if (result.outcome === "NOT_CURRENTLY_VALID") {
    const { certificate } = result;
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
            <Card>
              <CardBody className="sm:px-7 sm:py-8">
                <div className="flex flex-col items-center text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-status-neutral-bg text-status-neutral">
                    <ShieldOff aria-hidden className="size-6" />
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-status-neutral">
                    Not currently valid
                  </p>
                  <p className="mt-2 font-mono text-lg font-semibold text-ink">
                    {certificate.certificateNumber}
                  </p>
                  <p className="mt-3 max-w-sm text-sm text-ink-soft">
                    This certificate was issued on{" "}
                    {formatDate(certificate.issuedAt)} but is no longer valid.
                    Please contact us if you need more information.
                  </p>
                </div>
              </CardBody>
            </Card>

            <p className="mt-6 text-center text-sm">
              <Link
                href="/verify"
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                Verify another certificate
              </Link>
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { certificate } = result;
  const pdfHref = `/api/verify/certificates/${encodeURIComponent(
    certificate.certificateNumber,
  )}/pdf`;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-status-success-bg text-status-success">
              <BadgeCheck aria-hidden className="size-7" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-status-success">
              Certificate verified
            </p>
            <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {certificate.certificateNumber}
            </h1>
            <p className="mt-3 max-w-md text-sm text-ink-soft text-pretty">
              This certificate was issued by {certificate.organisationName} on{" "}
              {formatDate(certificate.issuedAt)} and is valid.
            </p>
          </div>

          <Card>
            <CardHeader
              title="Certificate information"
              description="As recorded when the certificate was issued."
            />
            <CardBody>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label="Applicant name" value={certificate.applicantName} />
                <Field label="Company name" value={certificate.companyName} />
                <Field label="Job title" value={certificate.jobTitle} />
                <Field label="Location" value={certificate.location} />
                <Field
                  label="Issue date"
                  value={formatDate(certificate.issuedAt)}
                />
                <Field label="Verification status" value="Verified" />
              </dl>
            </CardBody>
          </Card>

          {certificate.hasDocument ? (
            <Card className="mt-5">
              <CardHeader
                title="Certificate document"
                description="The original certificate exactly as it was issued."
              />
              <CardBody>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={pdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ className: "flex-1" })}
                  >
                    <ExternalLink aria-hidden className="mr-2 size-4" />
                    View Certificate
                  </a>
                  <a
                    href={`${pdfHref}?download=1`}
                    className={buttonClasses({
                      variant: "secondary",
                      className: "flex-1",
                    })}
                  >
                    <Download aria-hidden className="mr-2 size-4" />
                    Download Certificate
                  </a>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <p className="mt-6 text-center text-sm">
            <Link
              href="/verify"
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Verify another certificate
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
