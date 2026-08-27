import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { STORAGE_BUCKETS, storageRoot } from "./paths";

/**
 * Storage for generated certificate PDFs.
 *
 * Mirrors the uploaded-document layout: files live under the storage root in
 * dated folders with generated names, and only the relative path is recorded in
 * the database. The storage root can move to a mounted volume in production
 * without a schema or code change.
 */

export interface StoredCertificateFile {
  /** Path relative to the storage root — this is what goes in the database. */
  storagePath: string;
  sizeBytes: number;
}

export async function writeCertificatePdf(
  pdf: Buffer,
  issuedAt: Date = new Date(),
): Promise<StoredCertificateFile> {
  const relativeDir = path.join(
    STORAGE_BUCKETS.certificates,
    String(issuedAt.getUTCFullYear()),
    String(issuedAt.getUTCMonth() + 1).padStart(2, "0"),
  );
  const fileName = `${randomUUID()}.pdf`;
  const absoluteDir = path.join(storageRoot(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), pdf, { mode: 0o640 });

  return {
    storagePath: path.join(relativeDir, fileName).split(path.sep).join("/"),
    sizeBytes: pdf.byteLength,
  };
}

/**
 * Removes a certificate PDF.
 *
 * Used to roll back a file when the database transaction that would have
 * referenced it fails. Never throws: cleanup failing must not mask the original
 * error that caused the rollback.
 */
export async function deleteCertificatePdf(
  relativePath: string,
): Promise<void> {
  try {
    const { resolveStoragePath } = await import("./paths");
    await unlink(resolveStoragePath(relativePath));
  } catch (error) {
    console.error(
      "[certificates] could not remove orphaned PDF",
      relativePath,
      error,
    );
  }
}
