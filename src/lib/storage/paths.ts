import "server-only";

import path from "node:path";

import { env } from "@/lib/env";

/**
 * Single source of truth for where files live on disk.
 *
 * Nothing outside this module builds a filesystem path. Everything stored in
 * the database is *relative* to the storage root, so moving the root — to a
 * mounted volume in production, or later to object storage — means changing
 * STORAGE_ROOT (or this module) and nothing else.
 */

/** Absolute path of the storage root, resolved from the project directory. */
export function storageRoot(): string {
  // STORAGE_ROOT is deliberately runtime-configurable so production can point
  // at a volume outside the deployment directory. The bundler cannot know that
  // statically and would otherwise trace the entire project into the server
  // output, so opt out of that analysis explicitly.
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.storage.root);
}

/** Sub-directories under the storage root, keyed by what they hold. */
export const STORAGE_BUCKETS = {
  /** Documents uploaded by applicants. */
  uploads: "uploads",
  /** Certificates rendered by the backend. */
  certificates: "certificates",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Resolve a database-stored relative path to an absolute one.
 *
 * Rejects anything that escapes the storage root, so a crafted path in the
 * database can never be used to read arbitrary files off the server.
 */
export function resolveStoragePath(relativePath: string): string {
  const root = storageRoot();
  const absolute = path.resolve(root, relativePath);

  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new Error(`Refusing to resolve path outside the storage root: ${relativePath}`);
  }

  return absolute;
}
