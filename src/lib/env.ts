import "server-only";

/**
 * Server-side environment configuration.
 *
 * Every variable is read and validated once, at module load, so a
 * misconfigured deployment fails immediately and loudly instead of throwing
 * somewhere deep inside a request handler.
 *
 * The `server-only` import above makes it a build error to import this module
 * from a Client Component, which is what keeps DATABASE_URL and AUTH_SECRET
 * out of the browser bundle.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Environment variable "${name}" must be a positive integer, got "${raw}".`,
    );
  }
  return parsed;
}

const MIN_AUTH_SECRET_LENGTH = 32;

function authSecret(): string {
  const value = required("AUTH_SECRET");
  if (value.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters. ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }
  return value;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",

  databaseUrl: required("DATABASE_URL"),

  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  auth: {
    secret: authSecret(),
    sessionMaxAgeSeconds: positiveInt("AUTH_SESSION_MAX_AGE", 60 * 60 * 8),
  },

  storage: {
    /** Root directory for all user-supplied and generated files. */
    root: optional("STORAGE_ROOT", "./storage"),
    maxUploadSizeBytes: positiveInt("MAX_UPLOAD_SIZE_BYTES", 20 * 1024 * 1024),
  },

  /**
   * Organisation printed on generated certificates.
   *
   * Nothing is branded by default. Until NEXT_PUBLIC_ORGANISATION_NAME is set,
   * certificates are stamped as unconfigured so a placeholder can never be
   * mistaken for an officially issued document.
   */
  organisation: {
    name: optional("NEXT_PUBLIC_ORGANISATION_NAME", ""),
    address: optional("ORGANISATION_ADDRESS", ""),
    website: optional("ORGANISATION_WEBSITE", ""),
  },

  turnstile: {
    /**
     * Cloudflare Turnstile secret, used server-side to verify the token the
     * widget produces. Empty means CAPTCHA is not configured.
     */
    secretKey: process.env.TURNSTILE_SECRET_KEY?.trim() ?? "",
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "",
  },
} as const;

/**
 * Cloudflare's published testing keys. They exercise the real siteverify
 * endpoint — they do not bypass it — but they always return the same verdict,
 * so they must never reach production.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const TURNSTILE_TEST_SECRETS: readonly string[] = [
  "1x0000000000000000000000000000000AA", // always passes
  "2x0000000000000000000000000000000AA", // always fails
  "3x0000000000000000000000000000000AA", // yields a token-already-spent error
];

export function isTurnstileTestSecret(secret: string): boolean {
  return TURNSTILE_TEST_SECRETS.includes(secret);
}

/**
 * Fail fast rather than silently accepting every visitor as human.
 *
 * Runs at module load so a production deployment with a missing or test
 * CAPTCHA secret refuses to boot instead of shipping an open form.
 *
 * Skipped during `next build`, which also runs with NODE_ENV=production but
 * has no business needing a working CAPTCHA — the check belongs to the running
 * server, not to compilation. `verifyCaptchaToken` additionally fails closed at
 * request time, so a bypassed boot check still cannot let a submission through.
 */
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !IS_BUILD_PHASE) {
  const secret = env.turnstile.secretKey;

  if (!secret) {
    throw new Error(
      "TURNSTILE_SECRET_KEY is required in production. Configure Cloudflare " +
        "Turnstile, or the request form would accept unverified submissions.",
    );
  }
  if (isTurnstileTestSecret(secret)) {
    throw new Error(
      "TURNSTILE_SECRET_KEY is a Cloudflare test key, which always returns a " +
        "fixed verdict. Replace it with the real secret before deploying.",
    );
  }
}

export type Env = typeof env;
