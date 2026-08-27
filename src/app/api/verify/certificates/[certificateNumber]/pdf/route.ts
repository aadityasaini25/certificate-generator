import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";

import { findPublicCertificateFile } from "@/lib/certificates/verify";
import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";
import { resolveStoragePath } from "@/lib/storage/paths";
import { certificateNumberSchema } from "@/lib/validations/verify";

/**
 * Public certificate PDF.
 *
 * Serves the exact file produced when the certificate was issued. Nothing is
 * rendered here — a certificate the public downloads is byte-for-byte the
 * document that was generated and stored, so it can never drift from what was
 * issued.
 *
 * The caller supplies a certificate number, never a path. The stored relative
 * path is read from the database and resolved through `resolveStoragePath`,
 * which refuses anything outside the storage root, so arbitrary file access is
 * impossible by construction.
 */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

/** One response for every failure, so nothing can be probed. */
function notFound() {
  return NextResponse.json(
    { error: "Certificate not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateNumber: string }> },
) {
  const limit = checkRateLimit(
    rateLimitKeyFromHeaders(request.headers, "verify-pdf"),
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const { certificateNumber } = await params;

  // Validated and normalised before it reaches the database. The allowed
  // character set excludes path separators entirely.
  const parsed = certificateNumberSchema.safeParse(
    decodeURIComponent(certificateNumber),
  );
  if (!parsed.success) return notFound();

  const certificate = await findPublicCertificateFile(parsed.data);
  if (!certificate) return notFound();

  let absolutePath: string;
  try {
    absolutePath = resolveStoragePath(certificate.storagePath);
  } catch (error) {
    console.error("[verify] refused to resolve stored path:", error);
    return notFound();
  }

  let fileSize: number;
  try {
    const stats = await stat(absolutePath);
    if (!stats.isFile()) throw new Error("not a regular file");
    fileSize = stats.size;
  } catch {
    console.error(
      "[verify] certificate file missing on disk for",
      certificate.certificateNumber,
    );
    return notFound();
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const fileName = `${certificate.certificateNumber}.pdf`;

  const stream = Readable.toWeb(
    createReadStream(absolutePath),
  ) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileSize),
      "Content-Disposition": `${
        wantsDownload ? "attachment" : "inline"
      }; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
      // An issued certificate is immutable, so it is cacheable — but only by
      // the requesting browser, never by a shared proxy.
      "Cache-Control": "private, max-age=300",
      // The document is untrusted content as far as the browser is concerned.
      "Content-Security-Policy":
        "default-src 'none'; sandbox; frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
