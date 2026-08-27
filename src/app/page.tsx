import Link from "next/link";
import { ClipboardList, FileCheck2, ShieldCheck, UploadCloud } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonClasses } from "@/components/ui";

const PROCESS_STEPS = [
  {
    icon: ClipboardList,
    title: "Submit your details",
    description:
      "Complete the application form with your applicant, company and certificate information.",
  },
  {
    icon: UploadCloud,
    title: "Attach documents",
    description:
      "Upload the supporting documents required for your certificate type.",
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    description:
      "Our team reviews the submission and may add remarks or request corrections.",
  },
  {
    icon: FileCheck2,
    title: "Certificate issued",
    description:
      "Once approved, your certificate is generated and made available to download.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                Online application portal
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
                Apply for your certificate without the paperwork
              </h1>
              <p className="mt-5 text-lg text-ink-soft text-pretty">
                Submit your certificate application online, attach the required
                documents, and track it through review until your certificate is
                issued.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/request"
                  className={buttonClasses({ variant: "cta", size: "lg" })}
                >
                  Start an application
                </Link>
                <Link
                  href="/status"
                  className={buttonClasses({ variant: "secondary", size: "lg" })}
                >
                  Check request status
                </Link>
                <Link
                  href="/verify"
                  className={buttonClasses({ variant: "secondary", size: "lg" })}
                >
                  Verify a certificate
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Four steps from application to issued certificate.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-700">
                  <step.icon aria-hidden className="size-5" />
                </span>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-soft">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface-muted px-6 py-6">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Administrator?
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Sign in to review submissions and issue certificates.
                </p>
              </div>
              <Link
                href="/admin/login"
                className={buttonClasses({ variant: "secondary" })}
              >
                Admin sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
