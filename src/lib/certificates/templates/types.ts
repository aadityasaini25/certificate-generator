import type { CertificateSnapshot } from "../snapshot";

/**
 * Everything a template needs that is not part of the frozen snapshot.
 *
 * The verification URL depends on the deployment's public domain, which is
 * configuration rather than certificate data — so it is passed in explicitly
 * instead of being stored in the snapshot or read from the environment by the
 * template. That keeps the rule below intact while leaving the QR
 * deterministically reproducible from the configured domain plus the
 * certificate number.
 */
export interface CertificateRenderContext {
  /** The public verification URL encoded in the QR code. */
  verificationUrl: string;
  /** QR code as a PNG buffer, already rendered at print resolution. */
  qrPng: Buffer;
}

/**
 * Certificate template contract.
 *
 * A template receives a frozen snapshot plus the render context and draws onto
 * a pdfkit document. It must not read the database, the filesystem or the
 * environment — everything it is allowed to know is handed to it. That is what
 * makes re-rendering an old certificate reproduce the original document.
 *
 * Adding a design means adding a module that satisfies this interface and
 * registering it in `index.ts`; no generation logic changes.
 */
export interface CertificateTemplate {
  /** Stored in `Certificate.templateKey`. Must never change once used. */
  key: string;
  /** Shown in the admin UI when a design can be chosen. */
  label: string;
  /** Page setup this template expects. */
  page: {
    size: "A4" | "LETTER";
    layout: "portrait" | "landscape";
    margin: number;
  };
  render(
    doc: PDFKit.PDFDocument,
    snapshot: CertificateSnapshot,
    context: CertificateRenderContext,
  ): void;
}
