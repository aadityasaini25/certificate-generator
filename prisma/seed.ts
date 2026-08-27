import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seeds the initial administrator account.
 *
 * This is bootstrap data, not sample data: without it there is no way to sign
 * into the admin panel on a fresh database. It is idempotent, and it never
 * overwrites the password of an account that already exists.
 */

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable "${name}".`);
  }
  return value.trim();
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const email = requireEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const name = process.env.SEED_ADMIN_NAME?.trim() || "System Administrator";
  const password = requireEnv("SEED_ADMIN_PASSWORD");

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  if (password.startsWith("CHANGE_ME")) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is still the placeholder from .env.example. Set a real password first.",
    );
  }

  const adapter = new PrismaMariaDb(databaseUrl);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.admin.findUnique({ where: { email } });

    if (existing) {
      console.log(`✔ Admin "${email}" already exists — password left unchanged.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.admin.create({
      data: { email, name, passwordHash, role: "SUPER_ADMIN" },
    });

    console.log(`✔ Created super administrator "${email}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("✖ Seed failed:", error);
  process.exit(1);
});
