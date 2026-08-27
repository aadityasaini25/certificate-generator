import "server-only";

import PDFDocument from "pdfkit";

import { certificateVerificationUrl, renderQrPng } from "./qr";
import type { CertificateSnapshot } from "./snapshot";
import { getCertificateTemplate } from "./templates";

/**
 * Renders a snapshot to a PDF buffer.
 *
 * Buffers rather than streams to disk directly, because the caller needs the
 * complete document to succeed or fail as one unit before anything is written
 * or committed. Certificates are a page of text — size is not a concern.
 *
 * pdfkit is used instead of a headless browser: no Chromium to install or keep
 * patched, no browser chrome to strip, and identical output on any machine.
 */

export async function renderCertificatePdf(
  snapshot: CertificateSnapshot,
): Promise<Buffer> {
  const template = getCertificateTemplate(snapshot.templateKey);

  if (!template) {
    throw new Error(
      `Unknown certificate template "${snapshot.templateKey}". ` +
        `A certificate must never be rendered with a substituted design.`,
    );
  }

  const doc = new PDFDocument({
    size: template.page.size,
    layout: template.page.layout,
    margin: template.page.margin,
    // Nothing about the server or the database belongs in the file metadata.
    info: {
      Title: `Certificate ${snapshot.certificateNo}`,
      Author: snapshot.organisation.name,
      Subject: "Certificate of Submission",
      Creator: snapshot.organisation.name,
      Producer: snapshot.organisation.name,
    },
    autoFirstPage: true,
    bufferPages: false,
  });

  // Built before drawing starts: a certificate is required to carry its QR, so
  // a failure here must stop generation rather than quietly produce a
  // certificate that cannot be verified by scanning.
  const verificationUrl = certificateVerificationUrl(snapshot.certificateNo);
  const qrPng = await renderQrPng(verificationUrl);

  const chunks: Buffer[] = [];

  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  try {
    template.render(doc, snapshot, { verificationUrl, qrPng });
  } catch (error) {
    doc.end();
    throw error;
  }

  doc.end();
  return completed;
}
