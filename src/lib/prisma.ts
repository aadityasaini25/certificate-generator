import "server-only";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma Client singleton.
 *
 * Next.js clears the module registry on every hot reload in development, which
 * would otherwise open a brand-new connection pool on each edit until MySQL
 * refuses further connections. Caching the instance on `globalThis` survives
 * hot reloads; in production the module is instantiated exactly once anyway.
 *
 * Prisma 7 uses driver adapters, so the MySQL connection is owned by the
 * `mariadb` driver (wire-compatible with MySQL) rather than a Rust engine.
 */

function createPrismaClient(): PrismaClient {
  // Pool sizing is part of the connection string for this adapter, e.g.
  // mysql://user:pass@localhost:3306/db?connectionLimit=10
  const adapter = new PrismaMariaDb(env.databaseUrl);

  return new PrismaClient({
    adapter,
    log: env.isProduction ? ["error"] : ["query", "warn", "error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
