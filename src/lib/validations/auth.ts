import { z } from "zod";

/**
 * Admin login validation.
 *
 * Shared by the login form and the server action. Deliberately minimal: the
 * only job here is to reject obviously malformed input before it reaches the
 * database. Password *policy* is not enforced at login — only at the point a
 * password is set — because rejecting a login for a policy reason would leak
 * information about stored credentials.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    // Bounded to keep absurd inputs away from the database and bcrypt.
    .max(254, "Email must be 254 characters or fewer.")
    .pipe(z.email("Enter a valid email address.")),

  password: z
    .string()
    .min(1, "Password is required.")
    .max(200, "Password must be 200 characters or fewer."),
});

export type LoginValues = z.infer<typeof loginSchema>;

/**
 * The single message shown for every credential failure.
 *
 * Wrong password, unknown email and malformed-but-plausible input all produce
 * this exact text, so responses never reveal whether an account exists.
 */
export const GENERIC_AUTH_ERROR = "Invalid email or password.";

/** Shown only after the password has already been verified as correct. */
export const INACTIVE_ACCOUNT_ERROR =
  "This account has been deactivated. Please contact your administrator.";
