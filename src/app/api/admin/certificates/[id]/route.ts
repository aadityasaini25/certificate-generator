import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";

import { can } from "@/lib/auth/authorize";
import { getAuthenticatedAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/storage/paths";

/**
 * Certificate PDF access for the admin panel.
 *
 * Same guarantees as the uploaded-documents route: the caller supplies only a
 * certificate id, the stored path comes from the database, and
 * `resolveStoragePath` refuses anything outside the storage root.
 */

function contentDisposition(mode: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Reading an issued certificate needs only read access to submissions;
  // creating one needs certificate:generate.
  if (!can(admin.role, "submission:read")) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[a-z0-9]{1,64}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    select: { certificateNo: true, filePath: true },
  });

  if (!certificate?.filePath) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let absolutePath: string;
  try {
    absolutePath = resolveStoragePath(certificate.filePath);
  } catch (error) {
    console.error("[certificates] refused to resolve stored path:", error);
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let fileSize: number;
  try {
    const stats = await stat(absolutePath);
    if (!stats.isFile()) throw new Error("not a regular file");
    fileSize = stats.size;
  } catch {
    console.error("[certificates] PDF missing on disk for certificate", id);
    return NextResponse.json(
      { error: "The certificate file could not be read." },
      { status: 404 },
    );
  }

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const stream = Readable.toWeb(
    createReadStream(absolutePath),
  ) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileSize),
      "Content-Disposition": contentDisposition(
        wantsDownload ? "attachment" : "inline",
        `${certificate.certificateNo}.pdf`,
      ),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; sandbox; frame-ancestors 'self'",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
