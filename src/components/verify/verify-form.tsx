"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui";
import {
  MAX_CERTIFICATE_NUMBER_LENGTH,
  certificateNumberSchema,
} from "@/lib/validations/verify";

/**
 * Certificate lookup form.
 *
 * Navigates to /verify/<number> rather than posting, so every result has its
 * own shareable, bookmarkable URL — the same URL a QR code would encode later.
 * Client-side validation is a convenience; the result page re-validates and is
 * the only thing that decides what is shown.
 */

export function VerifyForm({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = certificateNumberSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a certificate number.");
      return;
    }

    setError(null);
    setIsNavigating(true);
    router.push(`/verify/${encodeURIComponent(parsed.data)}`);
  }

  const errorId = error ? "certificate-number-error" : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="certificateNumber"
          className="block text-sm font-medium text-ink"
        >
          Certificate number
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="certificateNumber"
            name="certificateNumber"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={MAX_CERTIFICATE_NUMBER_LENGTH}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            placeholder="CERT-YYYY-NNNNNN"
            className="field-control pl-9 font-mono uppercase"
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-status-danger">
            {error}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isNavigating}
      >
        {isNavigating ? "Verifying…" : "Verify Certificate"}
      </Button>
    </form>
  );
}
