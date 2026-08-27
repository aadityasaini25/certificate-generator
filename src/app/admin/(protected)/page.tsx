import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatCard, statCardsFrom } from "@/components/admin/stat-card";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { can } from "@/lib/auth/authorize";
import { requirePermission } from "@/lib/auth/dal";
import { SUBMISSION_STATUS_ORDER } from "@/lib/constants";
import {
  getDashboardStats,
  getRecentSubmissions,
} from "@/lib/submissions/queries";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Admin dashboard.
 *
 * Every number comes from a MySQL aggregate — nothing here is hard-coded, and
 * counting happens in the database rather than by loading rows.
 */
export default async function AdminDashboardPage() {
  const admin = await requirePermission("submission:read", "/admin");

  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    getRecentSubmissions(5),
  ]);

  const cards = statCardsFrom(
    stats.total,
    stats.byStatus,
    SUBMISSION_STATUS_ORDER,
  );

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Welcome back, {admin.name}.
        </p>
      </div>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Submission statistics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Recent Submissions"
          description="The five most recent certificate requests."
          action={
            <Link
              href="/admin/submissions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          }
        />
        <CardBody className="px-0 py-0 sm:px-0">
          <SubmissionsTable
            items={recent}
            canEdit={can(admin.role, "submission:edit")}
            emptyTitle="No submissions yet"
            emptyDescription="Requests submitted through the public form will appear here."
          />
        </CardBody>
      </Card>
    </div>
  );
}
