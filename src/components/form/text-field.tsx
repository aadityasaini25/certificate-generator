"use client";

import type { InputHTMLAttributes } from "react";

import { Field } from "./field";

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "aria-invalid" | "aria-describedby"
>;

export interface TextFieldProps extends NativeProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function TextField({
  id,
  label,
  required,
  error,
  hint,
  className,
  ...inputProps
}: TextFieldProps) {
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
        <input
          {...a11y}
          {...inputProps}
          // `required` is deliberately not set on the element: validation is
          // handled in JS so every field reports errors the same way.
          className="field-control"
        />
      )}
    </Field>
  );
}
