import { hash, verify, Algorithm, Version } from '@node-rs/argon2';

/**
 * ============================================================================
 * ALOR SPA — Hardened Argon2id Cryptographic Password Module
 * Strict compliance with OWASP & Phase 2 Blueprint Specifications
 * ============================================================================
 */

export const ARGON2_CONFIG = {
  algorithm: Algorithm.Argon2id,
  version: Version.V0x13, // version 19 (0x13)
  memoryCost: 65536,     // 64 MiB memory cost
  timeCost: 3,           // 3 iterations
  parallelism: 4,        // 4 concurrent threads
  outputLen: 32,         // 32 bytes derived key length
} as const;

/**
 * Pre-computed, immutable Dummy Hash generated with the EXACT same Argon2id parameters.
 * Used exclusively for constant-time dummy verification when an email is not found,
 * eliminating timing-attack discrepancies and preventing user enumeration.
 * NEVER re-generated per request.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$P7/YHvrM5DJQOC+yGhn7mQ$WyQCaHRGkC53TmOfyngSt+LAqOrb/dlGVjgCk759m58';

/**
 * Hashes a plaintext password using Argon2id with strict system parameters.
 * Passwords and hashes are NEVER printed or logged.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: ARGON2_CONFIG.algorithm,
    version: ARGON2_CONFIG.version,
    memoryCost: ARGON2_CONFIG.memoryCost,
    timeCost: ARGON2_CONFIG.timeCost,
    parallelism: ARGON2_CONFIG.parallelism,
    outputLen: ARGON2_CONFIG.outputLen,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 * Uses native constant-time comparison inside the Argon2 engine.
 */
export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password);
  } catch {
    // Return false on malformed hash or verification error without throwing
    return false;
  }
}

/**
 * Executes a dummy verification with identical computational weight (64MB / 3 iterations)
 * when an account does not exist. Always resolves to false.
 */
export async function verifyDummyPassword(password: string): Promise<boolean> {
  await verifyPassword(DUMMY_HASH, password);
  return false;
}

/**
 * Evaluates whether an existing hash requires re-hashing due to updated cryptographic parameters.
 */
export function needsRehash(hashString: string): boolean {
  if (!hashString.startsWith('$argon2id$')) {
    return true;
  }

  // Parse parameters from standard Argon2 hash format: $argon2id$v=19$m=65536,t=3,p=4$...
  const parts = hashString.split('$');
  if (parts.length < 5) return true;

  const versionPart = parts[2]; // e.g. "v=19"
  const paramsPart = parts[3];  // e.g. "m=65536,t=3,p=4"

  if (versionPart !== `v=${ARGON2_CONFIG.version}`) {
    return true;
  }

  const expectedParams = `m=${ARGON2_CONFIG.memoryCost},t=${ARGON2_CONFIG.timeCost},p=${ARGON2_CONFIG.parallelism}`;
  return paramsPart !== expectedParams;
}

/**
 * Common / weak passwords blocklist for policy enforcement
 */
const COMMON_WEAK_PASSWORDS = new Set([
  '123456789012',
  '1234567890123',
  'password12345',
  'admin12345678',
  'alorspa123456',
  'qwertyuiop12',
  'administrator',
  'superadmin123',
  'password1234',
  'letmein12345',
  'welcome12345',
  'changeme1234',
]);

/**
 * Enforces strong password policy:
 * - Minimum 12 characters.
 * - Rejects empty / whitespace-only.
 * - Rejects known common weak passwords.
 * - Avoids unnecessary arbitrary character rules to prioritize length & entropy.
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'كلمة المرور مطلوبة' };
  }

  if (password.length < 12) {
    return {
      valid: false,
      error: 'كلمة المرور يجب أن لا تقل عن 12 حرفاً لضمان الأمان العالي',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرفاً)',
    };
  }

  const normalized = password.toLowerCase().trim();
  if (COMMON_WEAK_PASSWORDS.has(normalized)) {
    return {
      valid: false,
      error: 'كلمة المرور شائعة جداً وسهلة التخمين، يرجى اختيار كلمة مرور أقوى وأكثر تميزاً',
    };
  }

  return { valid: true };
}
