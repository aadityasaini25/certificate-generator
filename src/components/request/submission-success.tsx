"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle2, ClipboardList, Copy } from "lucide-react";

import { buttonClasses } from "@/components/ui";
import { REQUEST_FORM } from "@/lib/constants";

/**
 * Post-submission confirmation.
 *
 * The reference ID is the only way an applicant can track their request later,
 * so it is given prominence, made easy to copy, and paired with a direct link
 * to the status page for that exact reference.
 */

export function SubmissionSuccess({ referenceNo }: { referenceNo: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(referenceNo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the value is selectable either way.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-center px-2 py-8 text-center sm:px-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-status-success-bg text-status-success">
        <CheckCircle2 aria-hidden className="size-6" />
      </span>

      <h2 className="mt-4 text-xl font-semibold text-ink">
        {REQUEST_FORM.successTitle}
      </h2>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        {REQUEST_FORM.successBody}
      </p>

      {referenceNo ? (
        <>
          <div className="mt-7 w-full max-w-sm rounded-card border border-line bg-surface-muted px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Reference ID
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink select-all">
              {referenceNo}
            </p>

            <button
              type="button"
              onClick={copyReference}
              className="mt-3 inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
            >
              {copied ? (
                <>
                  <Check aria-hidden className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy aria-hidden className="size-4" />
                  Copy reference ID
                </>
              )}
            </button>
            <span aria-live="polite" className="sr-only">
              {copied ? "Reference ID copied to clipboard" : ""}
            </span>
          </div>

          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Save this reference ID — you will need it to check the status of
            your request.
          </p>

          <Link
            href={`/status/${encodeURIComponent(referenceNo)}`}
            className={buttonClasses({ size: "lg", className: "mt-6" })}
          >
            <ClipboardList aria-hidden className="mr-2 size-4" />
            Check Request Status
          </Link>
        </>
      ) : null}
    </div>
  );
}
