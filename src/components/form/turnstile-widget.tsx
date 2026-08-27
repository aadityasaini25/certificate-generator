"use client";

import { useEffect, useRef } from "react";
import { ShieldAlert } from "lucide-react";

import { publicConfig } from "@/lib/public-config";

/**
 * Cloudflare Turnstile widget.
 *
 * Renders explicitly (rather than via auto-render) so the widget can be reset
 * after a failed submission — Turnstile tokens are single-use, so reusing one
 * always fails verification.
 *
 * When no site key is configured the widget is replaced by a visible notice.
 * It never silently pretends verification happened: the server decides, and in
 * production it refuses to start without a real secret.
 */

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("load failed")));
    document.head.appendChild(script);
  });
}

export interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  /** Increment to force a fresh challenge, e.g. after a failed submission. */
  resetSignal?: number;
  error?: string;
}

export function TurnstileWidget({
  onToken,
  resetSignal = 0,
  error,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep the latest callback without re-rendering the widget on every keystroke.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const siteKey = publicConfig.turnstile.siteKey;

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => onTokenRef.current(null),
          "expired-callback": () => onTokenRef.current(null),
          theme: "light",
        });
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  // A spent token cannot be reused, so reset the widget after a failed attempt.
  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current(null);
    }
  }, [resetSignal]);

  if (!siteKey) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface-muted px-4 py-3">
          <ShieldAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-muted"
          />
          <p className="text-sm text-ink-soft">
            CAPTCHA is not configured.{" "}
            <span className="text-ink-muted">
              Set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to
              enable it. Required before production.
            </span>
          </p>
        </div>
        {error ? <p className="text-sm text-status-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div ref={containerRef} />
      {error ? <p className="text-sm text-status-danger">{error}</p> : null}
    </div>
  );
}
