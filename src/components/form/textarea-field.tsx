"use client";

import type { TextareaHTMLAttributes } from "react";

import { Field } from "./field";

type NativeProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "aria-invalid" | "aria-describedby"
>;

export interface TextareaFieldProps extends NativeProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function TextareaField({
  id,
  label,
  required,
  error,
  hint,
  className,
  rows = 6,
  ...textareaProps
}: TextareaFieldProps) {
  return (
    <Field
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      {(a11y) => (
        <textarea
          {...a11y}
          {...textareaProps}
          rows={rows}
          className="field-control resize-y"
        />
      )}
    </Field>
  );
}
