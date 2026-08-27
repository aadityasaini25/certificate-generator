"use client";

import { useId, type ReactNode } from "react";

export interface CheckboxFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function CheckboxField({
  checked,
  onCheckedChange,
  label,
  required = false,
  error,
  disabled = false,
}: CheckboxFieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-line-strong text-brand-600 accent-brand-600 disabled:cursor-not-allowed"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink-soft">
          {label}
          {required ? (
            <span className="ml-0.5 text-status-danger" aria-hidden>
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
      </div>

      {error ? (
        <p id={errorId} className="text-sm text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
