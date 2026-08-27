"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { TextField } from "@/components/form";
import { Button } from "@/components/ui";
import { loginAction, type LoginFormState } from "@/lib/auth/actions";

/**
 * Admin sign-in form.
 *
 * Submits through a Server Action, so credentials are posted directly to the
 * server and never pass through client-side API code. `useActionState` gives
 * the pending state without tracking it manually.
 */

const INITIAL_STATE: LoginFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-control border border-status-danger bg-status-danger-bg px-3.5 py-3 text-sm text-status-danger"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoFocus
        required
        disabled={isPending}
        error={state.fieldErrors?.email}
      />

      <TextField
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        disabled={isPending}
        error={state.fieldErrors?.password}
      />

      <Button
        type="submit"
        size="lg"
        isLoading={isPending}
        className="w-full"
      >
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
