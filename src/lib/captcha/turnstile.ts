import "server-only";

import { env, isTurnstileTestSecret } from "@/lib/env";

/**
 * Cloudflare Turnstile verification.
 *
 * The browser widget produces a single-use token; only this server-side call
 * decides whether it is valid. A token is never trusted because the client
 * says so, and the result is never assumed on error — every failure path
 * returns `false`.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const VERIFY_TIMEOUT_MS = 10_000;

export type CaptchaResult =
  | { success: true }
  | { success: false; reason: string };

interface SiteVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/** True when a secret is present, so the form can hide the widget otherwise. */
export function isCaptchaConfigured(): boolean {
  return env.turnstile.secretKey !== "" && env.turnstile.siteKey !== "";
}

/** True when running against Cloudflare's fixed-verdict testing keys. */
export function isCaptchaInTestMode(): boolean {
  return isTurnstileTestSecret(env.turnstile.secretKey);
}

export async function verifyCaptchaToken(
  token: string | null,
  remoteIp?: string | null,
): Promise<CaptchaResult> {
  // In production a misconfigured CAPTCHA must reject every submission rather
  // than wave them all through. This backstops the boot-time guard in env.ts.
  if (env.isProduction && (!isCaptchaConfigured() || isCaptchaInTestMode())) {
    console.error(
      "[captcha] refusing submissions: CAPTCHA is missing or using test keys in production.",
    );
    return { success: false, reason: "CAPTCHA is not correctly configured." };
  }

  if (!isCaptchaConfigured()) {
    // Unreachable in production: src/lib/env.ts refuses to boot without a real
    // secret. In development an unconfigured CAPTCHA is allowed so the form
    // stays usable, and it is logged loudly.
    if (env.isProduction) {
      return { success: false, reason: "CAPTCHA is not configured." };
    }
    console.warn(
      "[captcha] TURNSTILE_SECRET_KEY is not set — skipping verification. " +
        "This is permitted in development only.",
    );
    return { success: true };
  }

  if (!token || token.trim() === "") {
    return { success: false, reason: "Verification challenge was not completed." };
  }

  const body = new URLSearchParams({
    secret: env.turnstile.secretKey,
    response: token,
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // Network failure or timeout: fail closed rather than letting the
    // submission through unverified.
    console.error("[captcha] siteverify request failed:", error);
    return {
      success: false,
      reason: "Could not reach the verification service. Please try again.",
    };
  }

  if (!response.ok) {
    console.error("[captcha] siteverify returned HTTP", response.status);
    return {
      success: false,
      reason: "Verification service error. Please try again.",
    };
  }

  const result = (await response.json()) as SiteVerifyResponse;

  if (!result.success) {
    // Error codes are diagnostic only; the visitor gets a generic message.
    console.warn("[captcha] verification rejected:", result["error-codes"]);
    return {
      success: false,
      reason: "Verification failed. Please try again.",
    };
  }

  return { success: true };
}
