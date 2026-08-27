import { snapshotValue, type CertificateSnapshot } from "../snapshot";
import type { CertificateRenderContext, CertificateTemplate } from "./types";

/**
 * Default certificate design.
 *
 * Deliberately unbranded: no logo, no client wording, no claim of
 * accreditation. It states what the submission actually contained and who
 * issued it, and nothing more. When the client confirms their branding, add a
 * new template module rather than editing this one, so certificates already
 * issued under `default` keep rendering exactly as they were.
 */

const INK = "#101828";
const SOFT = "#475467";
const MUTED = "#667085";
const LINE = "#d0d5dd";
const ACCENT = "#1d43f5";

/** A4 landscape at 72dpi. */
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** Printed size of the QR. The PNG is generated far larger and scaled down. */
const QR_SIZE = 92;
/** Gap between the QR and its caption. */
const QR_LABEL_GAP = 6;
const QR_LABEL_HEIGHT = 10;

function formatIssueDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Draws a label above its value, returning the height consumed. */
function field(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): number {
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.6 });

  const valueY = doc.y + 2;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(INK)
    .text(value, x, valueY, { width });

  return doc.y - y;
}

function renderDefaultTemplate(
  doc: PDFKit.PDFDocument,
  snapshot: CertificateSnapshot,
  context: CertificateRenderContext,
): void {
  const { submission, organisation, issuedBy } = snapshot;

  // --- Border -------------------------------------------------------------
  doc
    .save()
    .lineWidth(1.5)
    .strokeColor(LINE)
    .rect(MARGIN / 2, MARGIN / 2, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN)
    .stroke()
    .restore();

  // --- Header -------------------------------------------------------------
  let cursor = MARGIN + 6;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(ACCENT)
    .text(organisation.name.toUpperCase(), MARGIN, cursor, {
      width: CONTENT_WIDTH,
      align: "center",
      characterSpacing: 1.4,
    });

  cursor = doc.y + 14;

  doc
    .font("Helvetica")
    .fontSize(26)
    .fillColor(INK)
    .text("Certificate of Submission", MARGIN, cursor, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  cursor = doc.y + 8;

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(SOFT)
    .text(
      "This certifies that the document submission described below was received and verified.",
      MARGIN,
      cursor,
      { width: CONTENT_WIDTH, align: "center" },
    );

  cursor = doc.y + 18;

  // Certificate number, given prominence — it is the identifier that matters.
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(ACCENT)
    .text(snapshot.certificateNo, MARGIN, cursor, {
      width: CONTENT_WIDTH,
      align: "center",
      characterSpacing: 1.2,
    });

  cursor = doc.y + 18;

  doc
    .save()
    .moveTo(MARGIN, cursor)
    .lineTo(PAGE_WIDTH - MARGIN, cursor)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke()
    .restore();

  cursor += 22;

  // --- Details, two columns ----------------------------------------------
  const columnGap = 32;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const rightX = MARGIN + columnWidth + columnGap;

  const applicantName =
    [submission.firstName, submission.lastName].filter(Boolean).join(" ").trim() ||
    submission.applicantName;

  const leftRows: Array<[string, string]> = [
    ["Applicant name", snapshotValue(applicantName)],
    ["Email", snapshotValue(submission.email)],
    ["Company", snapshotValue(submission.companyName)],
  ];

  const rightRows: Array<[string, string]> = [
    ["Job title", snapshotValue(submission.jobTitle)],
    ["Location", snapshotValue(submission.location)],
    ["Reference number", snapshotValue(submission.referenceNo)],
  ];

  let leftY = cursor;
  for (const [label, value] of leftRows) {
    leftY += field(doc, label, value, MARGIN, leftY, columnWidth) + 12;
  }

  let rightY = cursor;
  for (const [label, value] of rightRows) {
    rightY += field(doc, label, value, rightX, rightY, columnWidth) + 12;
  }

  cursor = Math.max(leftY, rightY) + 2;

  // --- Request details ----------------------------------------------------
  // Confined to the left column: the QR occupies the lower right, and a
  // full-width block here could run underneath it.
  const footerTop = PAGE_HEIGHT - MARGIN - 62;

  if (submission.comments && submission.comments.trim().length > 0) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text("REQUEST DETAILS", MARGIN, cursor, {
        width: columnWidth,
        characterSpacing: 0.6,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(INK)
      .text(submission.comments.trim(), MARGIN, doc.y + 2, {
        width: columnWidth,
        // Bounded so an unusually long comment is truncated rather than
        // spilling into the footer or onto a second page.
        height: Math.max(0, footerTop - doc.y - 26),
        ellipsis: true,
      });

    cursor = doc.y + 14;
  }

  if (submission.documents.length > 0 && cursor < footerTop - 40) {
    const names = submission.documents
      .map((document) => document.originalName)
      .join(", ");
    field(doc, "Documents submitted", names, MARGIN, cursor, columnWidth);
    cursor = doc.y + 14;
  }

  // --- Verification QR ----------------------------------------------------
  // Anchored to the bottom-right, above the footer rule. Fixing it relative to
  // the footer rather than to flowing content means it can never be pushed
  // into the footer or collide with the details on the left.
  const qrX = PAGE_WIDTH - MARGIN - QR_SIZE;
  const qrY = footerTop - 18 - QR_LABEL_HEIGHT - QR_LABEL_GAP - QR_SIZE;

  // Square by construction: one dimension is given, so pdfkit preserves the
  // aspect ratio and the code is never stretched.
  doc.image(context.qrPng, qrX, qrY, { width: QR_SIZE });

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(MUTED)
    .text("Scan to verify certificate", qrX - 20, qrY + QR_SIZE + QR_LABEL_GAP, {
      width: QR_SIZE + 40,
      align: "center",
    });

  // --- Footer, pinned to the bottom of the page ---------------------------
  const footerY = footerTop;

  doc
    .save()
    .moveTo(MARGIN, footerY)
    .lineTo(PAGE_WIDTH - MARGIN, footerY)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke()
    .restore();

  field(
    doc,
    "Date of issue",
    formatIssueDate(snapshot.issuedAt),
    MARGIN,
    footerY + 12,
    columnWidth,
  );

  field(
    doc,
    "Issued by",
    `${issuedBy.name}, ${organisation.name}`,
    rightX,
    footerY + 12,
    columnWidth,
  );

  const contactLine = [organisation.address, organisation.website]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("  ·  ");

  if (contactLine) {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(contactLine, MARGIN, PAGE_HEIGHT - MARGIN - 8, {
        width: CONTENT_WIDTH,
        align: "center",
      });
  }

  // --- Unconfigured-deployment stamp --------------------------------------
  // Without a configured organisation this is not a real certificate, and it
  // must be impossible to mistake one for the real thing.
  if (organisation.isPlaceholder) {
    doc
      .save()
      .rotate(-24, { origin: [PAGE_WIDTH / 2, 300] })
      .font("Helvetica-Bold")
      .fontSize(38)
      .fillColor("#b42318")
      .opacity(0.16)
      .text("ORGANISATION NOT CONFIGURED", 0, 280, {
        width: PAGE_WIDTH,
        align: "center",
      })
      .opacity(1)
      .restore();
  }
}

export const defaultCertificateTemplate: CertificateTemplate = {
  key: "default",
  label: "Default (unbranded)",
  page: { size: "A4", layout: "landscape", margin: MARGIN },
  render: renderDefaultTemplate,
};
