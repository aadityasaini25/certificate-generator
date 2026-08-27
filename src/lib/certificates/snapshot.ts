/**
 * Frozen certificate snapshot.
 *
 * Everything a certificate needs to be rendered is copied here at issue time.
 * The PDF is produced from the snapshot, never from a live database read, so
 * editing the original submission afterwards cannot change what an already
 * issued certificate says — and re-rendering a lost PDF reproduces the original
 * document exactly.
 *
 * `version` is stored so a future snapshot shape can be migrated or rendered by
 * an older template without guesswork.
 */

export const CERTIFICATE_SNAPSHOT_VERSION = 1;

export interface CertificateSnapshotDocument {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CertificateSnapshot {
  version: number;

  certificateNo: string;
  /** ISO 8601, UTC. */
  issuedAt: string;
  templateKey: string;

  submission: {
    id: string;
    referenceNo: string;
    firstName: string;
    lastName: string;
    /** The stored combined name, kept in case the parts were never recorded. */
    applicantName: string;
    email: string;
    companyName: string | null;
    jobTitle: string | null;
    location: string | null;
    comments: string | null;
    /** ISO 8601, UTC. */
    submittedAt: string;
    documents: CertificateSnapshotDocument[];
  };

  issuedBy: {
    name: string;
    email: string;
  };

  organisation: {
    name: string;
    address: string;
    website: string;
    /** True when no organisation name was configured at issue time. */
    isPlaceholder: boolean;
  };
}

/**
 * Narrows an unknown JSON value from the database back to a snapshot.
 *
 * Returns null rather than throwing so a malformed row degrades to "PDF cannot
 * be re-rendered" instead of breaking the page that lists it.
 */
export function parseSnapshot(value: unknown): CertificateSnapshot | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<CertificateSnapshot>;
  if (
    typeof candidate.certificateNo !== "string" ||
    typeof candidate.issuedAt !== "string" ||
    !candidate.submission ||
    typeof candidate.submission !== "object" ||
    !candidate.organisation ||
    typeof candidate.organisation !== "object"
  ) {
    return null;
  }

  return candidate as CertificateSnapshot;
}

/** Presentation helper: empty optional fields render as an em dash. */
export function snapshotValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}
