import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";

/**
 * Django's `PBKDF2PasswordHasher` (django/contrib/auth/hashers.py):
 *
 *   salt  = get_random_string(22, allowed_chars=RANDOM_STRING_CHARS)
 *   hash  = base64(pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600000, 32))
 *   value = "pbkdf2_sha256$<iterations>$<salt>$<hash>"
 *
 * Reproduced here so passwords hashed by the Django backend keep working
 * after the API moves to Neon Functions.
 */
const ALGORITHM = "pbkdf2_sha256";
const ITERATIONS = 600000;
const DIGEST_SIZE = 32;
const SALT_LENGTH = 22;
const SALT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSalt(length = SALT_LENGTH): string {
  let out = "";
  while (out.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      // Rejection sampling keeps the distribution uniform over SALT_CHARS.
      if (byte < 248) {
        out += SALT_CHARS[byte % SALT_CHARS.length];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

function derive(password: string, salt: string, iterations: number): string {
  const dk = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    Buffer.from(salt, "utf8"),
    iterations,
    DIGEST_SIZE,
    "sha256",
  );
  return dk.toString("base64");
}

export function hashPassword(password: string): string {
  const salt = randomSalt();
  return `${ALGORITHM}$${ITERATIONS}$${salt}$${derive(password, salt, ITERATIONS)}`;
}

export function verifyPassword(password: string, encoded: string | null | undefined): boolean {
  if (!encoded) return false;
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;
  const [algorithm, iterationsRaw, salt, hash] = parts;
  if (algorithm !== ALGORITHM) return false;
  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const candidate = `${ALGORITHM}$${iterations}$${salt}$${derive(password, salt, iterations)}`;
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(encoded, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
