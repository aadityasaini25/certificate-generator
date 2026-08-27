import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import { validateUploadCandidate } from "@/lib/validations/submission";

import { STORAGE_BUCKETS, storageRoot } from "./paths";

/**
 * Persists an uploaded document to local storage.
 *
 * Three independent checks run before anything touches the disk: the declared
 * size, the file extension, and the file's leading magic bytes. The last one
 * matters most — a `.pdf` name and an `application/pdf` MIME header are both
 * attacker-controlled, the byte signature is not.
 */

export type UploadKind = "pdf" | "zip";

export interface StoredUpload {
  originalName: string;
  storedName: string;
  /** Path relative to the storage root — this is what goes in the database. */
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadOutcome =
  | { ok: true; upload: StoredUpload }
  | { ok: false; error: string };

/** Canonical MIME type per accepted kind, derived from content not headers. */
const CANONICAL_MIME: Record<UploadKind, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
};

/**
 * Identify a file by its leading bytes.
 *
 * PDF: "%PDF-"
 * ZIP: "PK\x03\x04" (normal), "PK\x05\x06" (empty), "PK\x07\x08" (spanned)
 */
export function detectUploadKind(bytes: Uint8Array): UploadKind | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d //   -
  ) {
    return "pdf";
  }

  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const third = bytes[2];
    const fourth = bytes[3];
    const isZipSignature =
      (third === 0x03 && fourth === 0x04) ||
      (third === 0x05 && fourth === 0x06) ||
      (third === 0x07 && fourth === 0x08);
    if (isZipSignature) return "zip";
  }

  return null;
}

/** Strip any directory component and control characters from a client name. */
export function sanitiseOriginalName(name: string): string {
  const base = path.basename(name.replace(/\\/g, "/")).trim();
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, "");
  return cleaned.slice(0, 255) || "document";
}

export async function storeSubmissionDocument(
  file: File,
): Promise<UploadOutcome> {
  const originalName = sanitiseOriginalName(file.name);

  // 1. Name and size, matching what the browser already enforced.
  const basicError = validateUploadCandidate(
    { name: originalName, size: file.size },
    env.storage.maxUploadSizeBytes,
  );
  if (basicError) {
    return { ok: false, error: basicError };
  }

  // 2. Read the bytes and confirm the content really is a PDF or a ZIP.
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Re-check the true byte length: `file.size` is client-reported metadata.
  if (bytes.byteLength > env.storage.maxUploadSizeBytes) {
    const limitMb = Math.floor(env.storage.maxUploadSizeBytes / (1024 * 1024));
    return {
      ok: false,
      error: `File is larger than ${limitMb}MB. Submit the form without an attachment and we will contact you.`,
    };
  }

  const kind = detectUploadKind(bytes);
  if (!kind) {
    return {
      ok: false,
      error: "That file is not a valid PDF or ZIP document.",
    };
  }

  // The extension must agree with the actual content, so a ZIP cannot be
  // stored (and later served) under a .pdf name.
  const extension = kind === "pdf" ? ".pdf" : ".zip";
  if (!originalName.toLowerCase().endsWith(extension)) {
    return {
      ok: false,
      error: `File contents do not match its extension — expected a ${kind.toUpperCase()} file.`,
    };
  }

  // 3. Write it under a generated name. The client-supplied name is recorded
  //    in the database for display but never used on disk.
  const now = new Date();
  const relativeDir = path.join(
    STORAGE_BUCKETS.uploads,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
  );
  const storedName = `${randomUUID()}${extension}`;
  const relativePath = path.join(relativeDir, storedName);
  const absoluteDir = path.join(storageRoot(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, storedName), bytes, { mode: 0o640 });

  return {
    ok: true,
    upload: {
      originalName,
      storedName,
      // Always store POSIX-style separators so paths are portable.
      storagePath: relativePath.split(path.sep).join("/"),
      mimeType: CANONICAL_MIME[kind],
      sizeBytes: bytes.byteLength,
    },
  };
}
