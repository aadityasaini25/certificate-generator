import "server-only";

import bcrypt from "bcryptjs";

/**
 * Password hashing and verification.
 *
 * bcrypt with a work factor of 12 — the same cost the seed script uses, so
 * seeded and later-created accounts are consistent.
 */

export const BCRYPT_ROUNDS = 12;

/**
 * A hash of an unguessable random value, generated once at build time.
 *
 * This is NOT a credential: no password produces it. It exists so that a login
 * attempt for an email that does not exist still performs a real bcrypt
 * comparison, making failed logins take the same time whether or not the
 * account is real. Without it, response timing would reveal which emails are
 * registered.
 */
const DECOY_HASH = "$2b$12$KIlOA1Peogu1XRivP1cRWuPNC9dnd7jo3DNtsppZrwG0aqqnb6Gku";

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS);
}

export function verifyPassword(
  plainText: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, passwordHash);
}

/**
 * Burn an equivalent amount of time when no account was found.
 *
 * Always resolves to false; the return value exists only so callers can use it
 * in place of a real comparison.
 */
export async function verifyAgainstDecoy(plainText: string): Promise<false> {
  await bcrypt.compare(plainText, DECOY_HASH);
  return false;
}
