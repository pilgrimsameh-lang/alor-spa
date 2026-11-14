import { eq, sql } from 'drizzle-orm';
import { adminUsers } from '../db/schema';
import { verifyPassword, verifyDummyPassword, needsRehash } from './password';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

/**
 * ============================================================================
 * ALOR SPA — Centralized Authentication & Lockout Enforcement Policy
 * Strict compliance with Phase 2 Blueprint Specifications
 * ============================================================================
 */

export const AUTH_POLICIES = {
  MAX_FAILED_ATTEMPTS: 5,             // 5 consecutive failures triggers lockout
  ACCOUNT_LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes lockout duration
  IP_WINDOW_MS: 15 * 60 * 1000,       // 15 minutes IP tracking window
  IP_MAX_FAILED_ATTEMPTS: 10,         // Max 10 failed attempts per IP per window
  GENERIC_ERROR_MESSAGE_AR: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  GENERIC_ERROR_MESSAGE_EN: 'Invalid credentials provided',
} as const;

/**
 * In-memory IP-based rate limiter to protect against distributed brute-force attacks.
 */
interface IpRecord {
  failures: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const ipFailureMap = new Map<string, IpRecord>();

export const ipRateLimiter = {
  check(ip: string): { allowed: boolean; remainingSeconds?: number } {
    const now = Date.now();
    const record = ipFailureMap.get(ip);
    if (!record) return { allowed: true };

    // Reset window if expired
    if (now - record.firstAttemptAt > AUTH_POLICIES.IP_WINDOW_MS) {
      ipFailureMap.delete(ip);
      return { allowed: true };
    }

    if (record.blockedUntil && record.blockedUntil > now) {
      const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, remainingSeconds };
    }

    return { allowed: true };
  },

  recordFailure(ip: string): void {
    const now = Date.now();
    let record = ipFailureMap.get(ip);

    if (!record || now - record.firstAttemptAt > AUTH_POLICIES.IP_WINDOW_MS) {
      record = { failures: 1, firstAttemptAt: now, blockedUntil: null };
    } else {
      record.failures += 1;
    }

    if (record.failures >= AUTH_POLICIES.IP_MAX_FAILED_ATTEMPTS) {
      record.blockedUntil = now + AUTH_POLICIES.ACCOUNT_LOCKOUT_MS;
    }

    ipFailureMap.set(ip, record);
  },

  recordSuccess(ip: string): void {
    ipFailureMap.delete(ip);
  },

  _clearAllForTesting(): void {
    ipFailureMap.clear();
  },
};

/**
 * Checks if an account is currently under temporary lockout.
 */
export function isAccountLocked(user: { locked_until: number | null }): {
  isLocked: boolean;
  remainingSeconds?: number;
} {
  if (!user.locked_until) return { isLocked: false };
  const now = Date.now();
  if (user.locked_until > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((user.locked_until - now) / 1000),
    };
  }
  return { isLocked: false };
}

export interface AuthEvaluationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    roleId: string;
  };
  needsPasswordRehash?: boolean;
  errorCode: 'INVALID_CREDENTIALS' | 'RATE_LIMITED';
  errorMessageAr: string;
  errorMessageEn: string;
}

/**
 * Centralized authentication verification routine.
 * Enforces:
 * 1. IP Rate Limiting.
 * 2. Timing-attack prevention via Dummy Hash verification when email not found or user inactive.
 * 3. Strict 15-minute lockout after 5 consecutive failed attempts.
 * 4. Automatic counter reset on successful login.
 * 5. Uniform error responses to prevent user enumeration.
 */
export async function authenticateCredentials(
  db: DrizzleD1Database<typeof schema> | LibSQLDatabase<typeof schema>,
  params: {
    email: string;
    password: string;
    ip?: string;
  }
): Promise<AuthEvaluationResult> {
  const clientIp = params.ip || 'unknown';

  // 1. IP Rate Limiting check
  const ipCheck = ipRateLimiter.check(clientIp);
  if (!ipCheck.allowed) {
    return {
      success: false,
      errorCode: 'RATE_LIMITED',
      errorMessageAr: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_AR,
      errorMessageEn: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_EN,
    };
  }

  const normalizedEmail = params.email.trim().toLowerCase();

  // 2. Fetch user record
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  // 3. User does not exist: run constant-time dummy verification
  if (!user) {
    ipRateLimiter.recordFailure(clientIp);
    await verifyDummyPassword(params.password);
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorMessageAr: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_AR,
      errorMessageEn: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_EN,
    };
  }

  // 4. Inactive user: reject uniformly without revealing status
  if (user.is_active !== 1) {
    ipRateLimiter.recordFailure(clientIp);
    await verifyDummyPassword(params.password);
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorMessageAr: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_AR,
      errorMessageEn: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_EN,
    };
  }

  // 5. Account lockout check
  const lockStatus = isAccountLocked(user);
  if (lockStatus.isLocked) {
    ipRateLimiter.recordFailure(clientIp);
    // Do not run password check when account is actively locked
    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorMessageAr: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_AR,
      errorMessageEn: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_EN,
    };
  }

  // 6. Verify password
  const isValidPassword = await verifyPassword(user.password_hash, params.password);

  if (!isValidPassword) {
    // Record failed attempt atomically in SQLite to prevent lost updates under race conditions
    ipRateLimiter.recordFailure(clientIp);
    const now = Date.now();
    const lockoutTarget = now + AUTH_POLICIES.ACCOUNT_LOCKOUT_MS;

    await db
      .update(adminUsers)
      .set({
        failed_login_attempts: sql`${adminUsers.failed_login_attempts} + 1`,
        locked_until: sql`CASE WHEN ${adminUsers.failed_login_attempts} + 1 >= ${AUTH_POLICIES.MAX_FAILED_ATTEMPTS} THEN ${lockoutTarget} ELSE ${adminUsers.locked_until} END`,
        updated_at: now,
      })
      .where(eq(adminUsers.id, user.id));

    return {
      success: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorMessageAr: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_AR,
      errorMessageEn: AUTH_POLICIES.GENERIC_ERROR_MESSAGE_EN,
    };
  }

  // 7. Success: reset failed attempts & advance login_generation
  ipRateLimiter.recordSuccess(clientIp);
  const successNow = Date.now();

  await db
    .update(adminUsers)
    .set({
      failed_login_attempts: 0,
      locked_until: null,
      login_generation: sql`${adminUsers.login_generation} + 1`,
      last_login_at: successNow,
      updated_at: successNow,
    })
    .where(eq(adminUsers.id, user.id));

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      roleId: user.role_id,
    },
    needsPasswordRehash: needsRehash(user.password_hash),
    errorCode: 'INVALID_CREDENTIALS',
    errorMessageAr: '',
    errorMessageEn: '',
  };
}
