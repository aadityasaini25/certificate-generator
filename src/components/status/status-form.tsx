"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui";
import { MAX_REFERENCE_LENGTH, referenceSchema } from "@/lib/validations/status";

/**
 * Reference-ID lookup form.
 *
 * Navigates to /status/<reference> rather than posting, so a result has its own
 * URL that the applicant can bookmark or return to. Client validation is a
 * convenience only — the result page re-validates server-side.
 */

export function StatusForm({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = referenceSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your reference ID.");
      return;
    }

    setError(null);
    setIsNavigating(true);
    router.push(`/status/${encodeURIComponent(parsed.data)}`);
  }

  const errorId = error ? "reference-error" : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="reference"
          className="block text-sm font-medium text-ink"
        >
          Reference ID
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="reference"
            name="reference"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={MAX_REFERENCE_LENGTH}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            placeholder="CRT-YYYY-XXXXXX"
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
        {isNavigating ? "Checking…" : "Check Status"}
      </Button>
    </form>
  );
}
