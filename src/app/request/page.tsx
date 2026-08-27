import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RequestForm } from "@/components/request/request-form";
import { Card, CardBody } from "@/components/ui";
import { REQUEST_FORM } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Request a certificate verification",
  description:
    "Submit your certificate or document for verification. Upload a PDF or a ZIP of multiple documents and our team will review your request.",
};

export default function RequestPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
              {REQUEST_FORM.heading}
            </h1>
            <p className="mt-3 text-ink-soft text-pretty">
              {REQUEST_FORM.intro}
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Fields marked with{" "}
              <span className="text-status-danger" aria-hidden>
                *
              </span>
              <span className="sr-only">an asterisk</span> are required.
            </p>
          </header>

          <Card>
            <CardBody className="sm:px-8 sm:py-8">
              <RequestForm />
            </CardBody>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
