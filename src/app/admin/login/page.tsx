import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { Card, CardBody } from "@/components/ui";
import { redirectIfAuthenticated } from "@/lib/auth/dal";
import { APP } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // An already-authenticated admin has no reason to see this page.
  await redirectIfAuthenticated();

  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-card bg-brand-600 text-white">
            <ShieldCheck aria-hidden className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            {APP.name} Admin
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Sign in to review submissions and issue certificates.
          </p>
        </div>

        <Card>
          <CardBody className="sm:px-6">
            <LoginForm next={next} />
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Authorised personnel only. Access is logged.
        </p>
      </div>
    </main>
  );
}
