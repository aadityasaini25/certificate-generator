"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button, type ButtonVariant } from "./button";

/**
 * Confirmation dialog for consequential actions.
 *
 * Built on the native <dialog> element, so focus trapping, Escape-to-close and
 * the top layer come from the browser rather than from hand-written focus
 * management.
 */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isPending?: boolean;
  onCancel: () => void;
  children?: ReactNode;
  /** Called when the confirm button is pressed. Ignored if `formAction` is set. */
  onConfirm?: () => void;
  /**
   * When provided, the dialog body is a real <form> posting to this action and
   * the confirm button submits it. This keeps the action working with
   * JavaScript disabled, rather than depending on a click handler.
   */
  formAction?: (formData: FormData) => void;
}

/** Wraps the dialog contents in a <form> only when an action is supplied. */
function Body({
  formAction,
  children,
}: {
  formAction?: (formData: FormData) => void;
  children: ReactNode;
}) {
  return formAction ? <form action={formAction}>{children}</form> : <>{children}</>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  isPending = false,
  onConfirm,
  onCancel,
  children,
  formAction,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Escape closes the dialog natively; keep React state in step.
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onCancel();
      }}
      onClose={() => {
        if (open && !isPending) onCancel();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-card border border-line bg-surface p-0 shadow-overlay backdrop:bg-ink/40"
    >
      <Body formAction={formAction}>
        <div className="px-5 py-5 sm:px-6">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? (
            <div className="mt-2 text-sm text-ink-soft">{description}</div>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-muted px-5 py-4 sm:px-6">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            type={formAction ? "submit" : "button"}
            variant={confirmVariant}
            onClick={formAction ? undefined : onConfirm}
            isLoading={isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      </Body>
    </dialog>
  );
}
