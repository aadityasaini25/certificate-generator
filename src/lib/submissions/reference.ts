import "server-only";

import { randomInt } from "node:crypto";

/**
 * Human-facing tracking number, e.g. CRT-2026-7K4M2Q.
 *
 * Random rather than sequential: a sequential counter would need a lock or a
 * separate counter table to stay race-free under concurrent submissions, and
 * would also leak how many requests the business receives. The caller retries
 * on the (vanishingly unlikely) unique-constraint collision.
 */

/** Excludes I, O, 0 and 1 so the code is unambiguous when read aloud. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

export function generateReferenceNo(now: Date = new Date()): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `CRT-${now.getUTCFullYear()}-${code}`;
}
