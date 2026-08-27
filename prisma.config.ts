import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read by the Prisma CLI only. This file is never bundled into the browser.
    url: env("DATABASE_URL"),
    // Prisma Migrate needs a scratch database to detect schema drift. Pointing
    // it at a named database means the application's MySQL user does not need
    // permission to create arbitrary databases.
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
