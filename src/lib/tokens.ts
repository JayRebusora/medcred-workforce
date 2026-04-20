// src/lib/tokens.ts
// Invite token generation. The raw token goes into the email link;
// the SHA-256 hash is what we store in the database.
//
// Security model: if the DB is compromised, an attacker sees only hashes,
// which cannot be reversed to produce usable tokens. Same pattern as
// password reset links in most real-world apps.

import { randomBytes, createHash } from "crypto";

export const TOKEN_BYTES = 32; // 256 bits of entropy
export const TOKEN_TTL_HOURS = 48;

/** Generate a fresh token. Returns both the raw value (for the email link)
 *  and the hash (for storage). Raw value is URL-safe base64. */
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const hash = hashToken(raw);
  return { raw, hash };
}

/** Hash a token for DB storage or lookup. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Expiry timestamp from now. */
export function tokenExpiry(hoursFromNow = TOKEN_TTL_HOURS): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}
