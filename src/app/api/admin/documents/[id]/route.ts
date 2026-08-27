import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/storage/paths";

/**
 * Secure document access for the admin panel.
 *
 * The browser supplies only a document id. The stored path is read from the
 * database and resolved through `resolveStoragePath`, which refuses anything
 * outside the storage root — so a path can never be chosen by the caller and
 * traversal is impossible by construction.
 *
 * This route returns 401/403 rather than redirecting, because a redirect to an
 * HTML login page is useless to something fetching a file.
 */

/** Only formats the upload pipeline actually produces are ever served. */
const SERVABLE_MIME_TYPES = new Set(["application/pdf", "application/zip"]);

/** PDFs may render in the browser; archives must always download. */
const INLINE_MIME_TYPES = new Set(["application/pdf"]);

/**
 * Builds a Content-Disposition value safely.
 *
 * The plain `filename` is stripped to ASCII so a crafted name cannot inject
 * header syntax; `filename*` carries the exact name per RFC 5987.
 */
function contentDisposition(mode: "inline" | "attachment", name: string) {
  const asciiFallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `${mode}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Authentication.
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // 2. Authorisation, through the shared permission table.
  if (!can(admin.role, "submission:read")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  // 3. Look the document up by id; the path is ours, never the caller's.
  const { id } = await params;
  if (!/^[a-z0-9]{1,64}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const document = await prisma.uploadedDocument.findUnique({
    where: { id },
    select: {
      originalName: true,
      storagePath: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  if (!document || !SERVABLE_MIME_TYPES.has(document.mimeType)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // 4. Resolve within the storage root. Throws if the stored value would
  //    escape it, which would mean the database itself had been tampered with.
  let absolutePath: string;
  try {
    absolutePath = resolveStoragePath(document.storagePath);
  } catch (error) {
    console.error("[documents] refused to resolve stored path:", error);
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let fileSize: number;
  try {
    const stats = await stat(absolutePath);
    if (!stats.isFile()) throw new Error("not a regular file");
    fileSize = stats.size;
  } catch {
    // The row exists but the file does not — a storage problem, not a client
    // error, so it is logged and reported as missing.
    console.error("[documents] file missing on disk for document", id);
    return NextResponse.json(
      { error: "The stored file could not be read." },
      { status: 404 },
    );
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const mode =
    !wantsDownload && INLINE_MIME_TYPES.has(document.mimeType)
      ? "inline"
      : "attachment";

  const stream = Readable.toWeb(
    createReadStream(absolutePath),
  ) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(fileSize),
      "Content-Disposition": contentDisposition(mode, document.originalName),
      // Never let a browser second-guess the type we declared.
      "X-Content-Type-Options": "nosniff",
      // A PDF rendered inline gets no scripting, no network, no plugins — an
      // uploaded document is untrusted content.
      "Content-Security-Policy": "default-src 'none'; sandbox; frame-ancestors 'self'",
      // Applicant documents must never be cached by a shared proxy.
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
