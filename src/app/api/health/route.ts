import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Liveness / readiness probe.
 *
 * Round-trips a trivial query to MySQL so a green response proves the whole
 * chain — Next.js server, Prisma client, driver adapter, database — is up.
 * Deliberately reveals nothing about the database beyond up/down.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        latencyMs: Date.now() - startedAt,
      },
      { status: 200 },
    );
  } catch (error) {
    // Log the detail server-side; never leak connection strings to the client.
    console.error("[health] database check failed:", error);

    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}

// Always execute; a cached health check is worthless.
export const dynamic = "force-dynamic";
