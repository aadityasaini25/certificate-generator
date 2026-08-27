import type { Metadata } from "next";
import { ClipboardList, Info } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StatusForm } from "@/components/status/status-form";
import { Card, CardBody } from "@/components/ui";

export const metadata: Metadata = {
  title: "Check your request status",
  description:
    "Enter your reference ID to check the current status of your certificate request.",
};

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  // Supports /status?reference=... so a link can prefill the field.
  const { reference } = await searchParams;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-card bg-brand-50 text-brand-700">
              <ClipboardList aria-hidden className="size-6" />
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink text-balance">
              Check Your Request Status
            </h1>
            <p className="mt-3 text-ink-soft text-pretty">
              Enter your reference ID to check the current status of your
              request.
            </p>
          </div>

          <Card>
            <CardBody className="sm:px-7 sm:py-7">
              <StatusForm initialValue={reference ?? ""} />
            </CardBody>
          </Card>

          <div className="mt-6 flex items-start gap-2.5 rounded-card border border-line bg-surface px-4 py-3.5">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <p className="text-sm text-ink-soft">
              Your reference ID was shown when you submitted your request and
              looks like{" "}
              <span className="font-mono text-ink">CRT-YYYY-XXXXXX</span>. No
              account is needed.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
