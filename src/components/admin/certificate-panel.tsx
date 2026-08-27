"use client";

import { useActionState, useState } from "react";
import {
  AlertTriangle,
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Button, ConfirmDialog } from "@/components/ui";
import {
  generateCertificateAction,
  type GenerateCertificateState,
} from "@/lib/certificates/actions";
import { recoverSubmissionAction } from "@/lib/submissions/actions";
import { publicConfig } from "@/lib/public-config";
import { formatDateTime } from "@/lib/utils";
import type { SubmissionStatus } from "@/types";

/**
 * Certificate section of the submission detail page.
 *
 * Three states: an issued certificate, an approved submission that can be
 * issued one, and everything else. The buttons only reflect what the server
 * will allow — `generateCertificateAction` re-checks the permission and the
 * submission status regardless of what is rendered here.
 */

const INITIAL: GenerateCertificateState = {};

export interface IssuedCertificate {
  id: string;
  certificateNo: string;
  issuedAt: string;
  issuedByName: string | null;
  hasFile: boolean;
  revokedAt: string | null;
}

export interface CertificatePanelProps {
  submissionId: string;
  status: SubmissionStatus;
  certificate: IssuedCertificate | null;
  /** False when the signed-in admin lacks certificate:generate. */
  canGenerate: boolean;
}

export function CertificatePanel({
  submissionId,
  status,
  certificate,
  canGenerate,
}: CertificatePanelProps) {
  const [state, formAction, isPending] = useActionState(
    generateCertificateAction,
    INITIAL,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Close the dialog once the action reports back. Adjusting state during
  // render avoids an effect and the extra render pass it would cause.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setConfirmOpen(false);
  }

  // --- An issued certificate ----------------------------------------------
  if (certificate) {
    const href = `/api/admin/certificates/${certificate.id}`;
    // The same URL the certificate's QR code encodes.
    const verificationUrl = `${publicConfig.appUrl}/verify/${encodeURIComponent(
      certificate.certificateNo,
    )}`;

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-status-success-bg text-status-success">
            <Award aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-ink">
              {certificate.certificateNo}
            </p>
            <p className="text-xs text-ink-muted">
              {certificate.revokedAt ? "Revoked" : "Issued"}
              {" · "}
              {formatDateTime(certificate.issuedAt)}
            </p>
          </div>
        </div>

        <dl className="space-y-3 border-t border-line pt-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Status
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {certificate.revokedAt ? "Revoked" : "Issued"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Issued by
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {certificate.issuedByName ?? "—"}
            </dd>
          </div>
        </dl>

        {certificate.hasFile ? (
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              <ExternalLink aria-hidden className="size-4" />
              View certificate
            </a>
            <a
              href={`${href}?download=1`}
              className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <Download aria-hidden className="size-4" />
              Download
            </a>
            {/* The page an applicant or third party sees. No new admin
                verification screen is needed — this is the same public page. */}
            <a
              href={`/verify/${encodeURIComponent(certificate.certificateNo)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <ShieldCheck aria-hidden className="size-4" />
              Public page
            </a>
          </div>
        ) : (
          <p className="border-t border-line pt-4 text-sm text-ink-muted">
            The certificate document is not available on disk.
          </p>
        )}

        <VerificationUrl url={verificationUrl} />
      </div>
    );
  }

  // --- COMPLETED with no certificate: an invalid state ---------------------
  // Completed is supposed to mean a certificate was issued. Without one the
  // record is inconsistent, and must not be presented as a success.
  if (status === "COMPLETED") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3">
          <AlertTriangle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-status-danger"
          />
          <div>
            <p className="text-sm font-medium text-status-danger">
              Certificate record missing
            </p>
            <p className="mt-1 text-sm text-status-danger">
              This submission is marked Completed but no certificate exists. It
              requires recovery.
            </p>
          </div>
        </div>

        {canGenerate ? (
          <RecoveryForm submissionId={submissionId} />
        ) : (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
            Your role cannot recover this submission.
          </p>
        )}
      </div>
    );
  }

  // --- Not approved --------------------------------------------------------
  if (status !== "APPROVED") {
    return (
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        A certificate can only be generated once the submission is approved.
      </p>
    );
  }

  // --- Approved, no permission --------------------------------------------
  if (!canGenerate) {
    return (
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Your role cannot generate certificates.
      </p>
    );
  }

  // --- Approved and ready --------------------------------------------------
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        This submission is approved and has no certificate yet.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-status-danger bg-status-danger-bg px-3 py-2 text-sm text-status-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button onClick={() => setConfirmOpen(true)} isLoading={isPending}>
        Generate Certificate
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Generate certificate"
        confirmLabel="Generate certificate"
        isPending={isPending}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        formAction={formAction}
        description={
          <>
            A certificate number will be assigned and the submitted details will
            be frozen into the document. The submission moves to{" "}
            <strong className="font-medium text-ink">Completed</strong>, which is
            final — later edits will not change the issued certificate.
          </>
        }
      >
        <input type="hidden" name="submissionId" value={submissionId} />
        {state.error ? (
          <p role="alert" className="text-sm text-status-danger">
            {state.error}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/**
 * Supervised recovery from the invalid Completed-without-certificate state.
 *
 * Deliberately does not generate a certificate: it returns the submission to
 * Approved so an administrator can then issue one through the normal flow.
 */
function RecoveryForm({ submissionId }: { submissionId: string }) {
  const [state, formAction, isPending] = useActionState(
    recoverSubmissionAction,
    {} as { ok?: boolean; error?: string; message?: string },
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setConfirmOpen(false);
  }

  return (
    <div className="space-y-3">
      {state.error ? (
        <p
          role="alert"
          className="rounded-control border border-status-danger bg-status-danger-bg px-3 py-2 text-sm text-status-danger"
        >
          {state.error}
        </p>
      ) : null}

      <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
        Recover Submission
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Recover submission"
        confirmLabel="Return to Approved"
        isPending={isPending}
        onCancel={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        formAction={formAction}
        description={
          <>
            This returns the submission to{" "}
            <strong className="font-medium text-ink">Approved</strong> so a
            certificate can be generated. No certificate is created now, and the
            action is recorded in the submission history.
          </>
        }
      >
        <input type="hidden" name="submissionId" value={submissionId} />
        {state.error ? (
          <p role="alert" className="text-sm text-status-danger">
            {state.error}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/**
 * The public verification link, which is exactly what the certificate's QR
 * code encodes. Useful for sending to an applicant who cannot scan.
 */
function VerificationUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border-t border-line pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Verification URL
      </p>
      <p className="mt-1 break-all font-mono text-xs text-ink-soft select-all">
        {url}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
      >
        {copied ? (
          <>
            <Check aria-hidden className="size-4" />
            Copied
          </>
        ) : (
          <>
            <Copy aria-hidden className="size-4" />
            Copy Verification Link
          </>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Verification link copied to clipboard" : ""}
      </span>
    </div>
  );
}
