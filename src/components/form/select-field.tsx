"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { Field } from "./field";

type NativeProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "aria-invalid" | "aria-describedby" | "children"
>;

export interface SelectFieldProps extends NativeProps {
  id: string;
  label: string;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

export function SelectField({
  id,
  label,
  options,
  placeholder = "Please select",
  required,
  error,
  hint,
  className,
  ...selectProps
}: SelectFieldProps) {
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
        <div className="relative">
          <select
            {...a11y}
            {...selectProps}
            className="field-control appearance-none pr-10"
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </Field>
  );
}
