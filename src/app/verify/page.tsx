import type { Metadata } from "next";
import { FileSearch, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { VerifyForm } from "@/components/verify/verify-form";
import { Card, CardBody } from "@/components/ui";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description:
    "Check that a certificate is genuine by entering its certificate number.",
};

export default function VerifyPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-card bg-brand-50 text-brand-700">
              <ShieldCheck aria-hidden className="size-6" />
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink text-balance">
              Verify a certificate
            </h1>
            <p className="mt-3 text-ink-soft text-pretty">
              Enter the certificate number exactly as it appears on the
              certificate to confirm that it was issued by us and to view the
              original document.
            </p>
          </div>

          <Card>
            <CardBody className="sm:px-7 sm:py-7">
              <VerifyForm />
            </CardBody>
          </Card>

          <div className="mt-6 flex items-start gap-2.5 rounded-card border border-line bg-surface px-4 py-3.5">
            <FileSearch
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-muted"
            />
            <p className="text-sm text-ink-soft">
              Certificate numbers look like{" "}
              <span className="font-mono text-ink">CERT-YYYY-NNNNNN</span> and
              are printed on the certificate itself. No account is needed.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
