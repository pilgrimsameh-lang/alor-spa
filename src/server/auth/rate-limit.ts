import crypto from 'node:crypto';
import type { Client } from '@libsql/client';
import { executeWithSqliteBudget } from '../db/budget';

/**
 * ============================================================================
 * ALOR SPA — Persistent IP Rate Limiting, Reservations & HMAC Rotation
 * Mathematical single-pass atomic merge, strict concurrency leases
 * ============================================================================
 */

export const RATE_LIMIT_CONFIG = {
  MAX_ACCOUNT_FAILURES: 5,
  ACCOUNT_LOCKOUT_MS: 15 * 60 * 1000,   // 15 minutes
  MAX_IP_FAILURES: 10,
  IP_LOCKOUT_MS: 15 * 60 * 1000,        // 15 minutes
  IP_WINDOW_MS: 15 * 60 * 1000,         // 15 minutes
  LEASE_DURATION_MS: 15 * 1000,         // Strictly 15 seconds (15 * 1000)
  HARD_TIMEOUT_MS: 30 * 1000,           // 30 seconds hard limit
  HTTP_TIMEOUT_MS: 25 * 1000,           // 25 seconds browser disconnect boundary
  MAX_ACTIVE_IP_LEASES: 2,              // Max 2 concurrent leases per IP
  GLOBAL_RESERVATIONS_CAP: 2000,        // Global limit for pending reservations
} as const;

/**
 * Computes the cryptographically keyed HMAC for an IP address.
 * Key rotation versions are prepended into the message to isolate key domains.
 */
export function computeHmacKey(ip: string, secret: string, version = 1): string {
  const normalizedIp = ip.trim().toLowerCase();
  return crypto
    .createHmac('sha256', secret)
    .update(`v${version}:${normalizedIp}`)
    .digest('hex');
}

export interface AcquireReservationParams {
  ipKey: string;
  keyVersion?: number;
  accountId?: string | null;
  accountGen?: number | null;
  now?: number;
}

export interface AcquireReservationResult {
  admitted: boolean;
  reservationId?: string;
  leaseExpiresAt?: number;
  hardTimeoutAt?: number;
  ipGen?: number;
  accountGen?: number | null;
  reason?: 'IP_BLOCKED' | 'IP_CONCURRENCY_EXCEEDED' | 'ACCOUNT_LOCKED' | 'GLOBAL_CAP_EXCEEDED';
  blockedUntil?: number;
}

/**
 * Acquires a rate-limit and resource reservation slot atomically in SQLite.
 */
export async function acquireReservation(
  client: Client,
  params: AcquireReservationParams
): Promise<AcquireReservationResult> {
  const now = params.now ?? Date.now();
  const keyVersion = params.keyVersion ?? 1;

  return executeWithSqliteBudget(async () => {
    // 1. Purge expired reservations past their hard timeout (garbage collection)
    await client.execute({
      sql: `DELETE FROM rate_limit_reservations WHERE hard_timeout_at < ?;`,
      args: [now],
    });

    // 2. Check global reservations cap
    const globalCountRes = await client.execute(
      `SELECT COUNT(*) as c FROM rate_limit_reservations;`
    );
    const globalCount = Number(globalCountRes.rows[0]?.c ?? 0);
    if (globalCount >= RATE_LIMIT_CONFIG.GLOBAL_RESERVATIONS_CAP) {
      return { admitted: false, reason: 'GLOBAL_CAP_EXCEEDED' };
    }

    // 3. Ensure rate_limit_records row exists for this IP key
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, first_failure_at, blocked_until, generation, updated_at)
            VALUES (?, ?, 0, NULL, NULL, 1, ?)
            ON CONFLICT(key) DO UPDATE SET updated_at = ?;`,
      args: [params.ipKey, keyVersion, now, now],
    });

    // 4. Query current IP record state
    const ipRecordRes = await client.execute({
      sql: `SELECT key, key_version, failures, first_failure_at, blocked_until, generation FROM rate_limit_records WHERE key = ?;`,
      args: [params.ipKey],
    });
    const ipRecord = ipRecordRes.rows[0];
    if (!ipRecord) {
      return { admitted: false, reason: 'IP_BLOCKED' };
    }

    const ipBlockedUntil = ipRecord.blocked_until ? Number(ipRecord.blocked_until) : null;
    if (ipBlockedUntil && ipBlockedUntil > now) {
      return { admitted: false, reason: 'IP_BLOCKED', blockedUntil: ipBlockedUntil };
    }

    // 5. Check active IP leases concurrency (max 2)
    const activeLeasesRes = await client.execute({
      sql: `SELECT COUNT(*) as c FROM rate_limit_reservations WHERE key = ? AND lease_expires_at > ? AND status = 'ACTIVE';`,
      args: [params.ipKey, now],
    });
    const activeLeases = Number(activeLeasesRes.rows[0]?.c ?? 0);
    if (activeLeases >= RATE_LIMIT_CONFIG.MAX_ACTIVE_IP_LEASES) {
      return { admitted: false, reason: 'IP_CONCURRENCY_EXCEEDED' };
    }

    // 6. If accountId provided, verify account is not actively locked
    let snapshotAccountGen: number | null = null;
    if (params.accountId) {
      const userRes = await client.execute({
        sql: `SELECT id, is_active, locked_until, login_generation FROM admin_users WHERE id = ?;`,
        args: [params.accountId],
      });
      const user = userRes.rows[0];
      if (user) {
        if (Number(user.is_active) !== 1) {
          // Inactive user treated as generic invalid
        }
        const lockedUntil = user.locked_until ? Number(user.locked_until) : null;
        if (lockedUntil && lockedUntil > now) {
          return { admitted: false, reason: 'ACCOUNT_LOCKED', blockedUntil: lockedUntil };
        }
        snapshotAccountGen = Number(user.login_generation);
      }
    }

    // 7. Insert active reservation
    const reservationId = crypto.randomUUID();
    const leaseExpiresAt = now + RATE_LIMIT_CONFIG.LEASE_DURATION_MS;
    const hardTimeoutAt = now + RATE_LIMIT_CONFIG.HARD_TIMEOUT_MS;
    const ipGen = Number(ipRecord.generation);

    await client.execute({
      sql: `INSERT INTO rate_limit_reservations (id, key, account_id, snapshot_ip_generation, snapshot_account_generation, status, created_at, lease_expires_at, hard_timeout_at)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?);`,
      args: [
        reservationId,
        params.ipKey,
        params.accountId ?? null,
        ipGen,
        snapshotAccountGen,
        now,
        leaseExpiresAt,
        hardTimeoutAt,
      ],
    });

    return {
      admitted: true,
      reservationId,
      leaseExpiresAt,
      hardTimeoutAt,
      ipGen,
      accountGen: snapshotAccountGen,
    };
  });
}

/**
 * Cancels and deletes an active reservation (e.g. if semaphore times out or deadline exceeded).
 */
export async function cancelReservation(client: Client, reservationId: string): Promise<void> {
  await executeWithSqliteBudget(async () => {
    await client.execute({
      sql: `DELETE FROM rate_limit_reservations WHERE id = ?;`,
      args: [reservationId],
    });
  });
}

export interface FinalizeAuthParams {
  reservationId: string;
  ipKey: string;
  accountId?: string | null;
  accountGen?: number | null;
  isAuthentic: boolean;
  canIssueSession: boolean;
  tokenHash?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  now?: number;
}

export interface FinalizeAuthResult {
  success: boolean;
  sessionCreated: boolean;
  sessionId?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'CONCURRENCY_CHANGED';
}

/**
 * Atomically finalizes the authentication attempt:
 * 1. Deletes the temporary reservation.
 * 2. If failure: increments IP & Account failure counters, calculates lockouts, advances generation.
 * 3. If success: resets IP & Account counters, verifies generation, creates authenticated session.
 */
export async function finalizeAuthentication(
  client: Client,
  params: FinalizeAuthParams
): Promise<FinalizeAuthResult> {
  const now = params.now ?? Date.now();

  return executeWithSqliteBudget(async () => {
    // 1. Always remove the reservation row first
    await client.execute({
      sql: `DELETE FROM rate_limit_reservations WHERE id = ?;`,
      args: [params.reservationId],
    });

    // 2. Failure path
    if (!params.isAuthentic) {
      // IP failure tracking
      const ipRes = await client.execute({
        sql: `SELECT failures, first_failure_at FROM rate_limit_records WHERE key = ?;`,
        args: [params.ipKey],
      });
      const ipRow = ipRes.rows[0];

      let newFailures = 1;
      let firstFailureAt = now;

      if (ipRow && ipRow.first_failure_at) {
        const first = Number(ipRow.first_failure_at);
        if (now - first <= RATE_LIMIT_CONFIG.IP_WINDOW_MS) {
          newFailures = Number(ipRow.failures) + 1;
          firstFailureAt = first;
        }
      }

      const isBlocked = newFailures >= RATE_LIMIT_CONFIG.MAX_IP_FAILURES;
      const blockedUntil = isBlocked ? now + RATE_LIMIT_CONFIG.IP_LOCKOUT_MS : null;

      await client.execute({
        sql: `UPDATE rate_limit_records
              SET failures = ?,
                  first_failure_at = ?,
                  blocked_until = ?,
                  generation = generation + 1,
                  updated_at = ?
              WHERE key = ?;`,
        args: [newFailures, firstFailureAt, blockedUntil, now, params.ipKey],
      });

      // Account failure tracking (if account exists)
      if (params.accountId) {
        await client.execute({
          sql: `UPDATE admin_users
                SET failed_login_attempts = failed_login_attempts + 1,
                    locked_until = CASE WHEN failed_login_attempts + 1 >= ? THEN ? ELSE locked_until END,
                    updated_at = ?
                WHERE id = ?;`,
          args: [
            RATE_LIMIT_CONFIG.MAX_ACCOUNT_FAILURES,
            now + RATE_LIMIT_CONFIG.ACCOUNT_LOCKOUT_MS,
            now,
            params.accountId,
          ],
        });
      }

      return {
        success: false,
        sessionCreated: false,
        errorCode: isBlocked ? 'RATE_LIMITED' : 'INVALID_CREDENTIALS',
      };
    }

    // 3. Success path
    // Reset IP record failures
    await client.execute({
      sql: `UPDATE rate_limit_records
            SET failures = 0,
                first_failure_at = NULL,
                blocked_until = NULL,
                generation = generation + 1,
                updated_at = ?
            WHERE key = ?;`,
      args: [now, params.ipKey],
    });

    if (!params.accountId) {
      return { success: false, sessionCreated: false, errorCode: 'INVALID_CREDENTIALS' };
    }

    // Verify account state under lock
    const userRes = await client.execute({
      sql: `SELECT id, is_active, locked_until, security_generation, login_generation FROM admin_users WHERE id = ?;`,
      args: [params.accountId],
    });
    const user = userRes.rows[0];
    if (!user || Number(user.is_active) !== 1) {
      return { success: false, sessionCreated: false, errorCode: 'INVALID_CREDENTIALS' };
    }

    const lockedUntil = user.locked_until ? Number(user.locked_until) : null;
    if (lockedUntil && lockedUntil > now) {
      return { success: false, sessionCreated: false, errorCode: 'ACCOUNT_LOCKED' };
    }

    // Optimistic concurrency check: if password or account generation changed during Argon2 computation, abort session issuance
    if (params.accountGen !== undefined && params.accountGen !== null) {
      if (Number(user.login_generation) !== params.accountGen) {
        return { success: false, sessionCreated: false, errorCode: 'CONCURRENCY_CHANGED' };
      }
    }

    // Reset account failed attempts & advance login_generation
    await client.execute({
      sql: `UPDATE admin_users
            SET failed_login_attempts = 0,
                locked_until = NULL,
                login_generation = login_generation + 1,
                last_login_at = ?,
                updated_at = ?
            WHERE id = ?;`,
      args: [now, now, params.accountId],
    });

    // Create session if allowed by HTTP deadline and socket state
    if (params.canIssueSession && params.tokenHash) {
      const sessionId = crypto.randomUUID();
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days absolute expiry
      const secGen = Number(user.security_generation);

      await client.execute({
        sql: `INSERT INTO admin_sessions (id, user_id, token_hash, security_generation, ip_address, user_agent, created_at, last_activity_at, expires_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          sessionId,
          params.accountId,
          params.tokenHash,
          secGen,
          params.clientIp ?? null,
          params.userAgent ?? null,
          now,
          now,
          expiresAt,
        ],
      });

      return {
        success: true,
        sessionCreated: true,
        sessionId,
      };
    }

    return {
      success: true,
      sessionCreated: false,
    };
  });
}

/**
 * Performs a single-pass atomic merge of an old HMAC key (V1) into a new HMAC key (V2).
 * Prevents double-transformation and lost updates.
 */
export async function mergeKeyRotationRecord(
  client: Client,
  keyV1: string,
  keyV2: string,
  currVersion = 2,
  now = Date.now()
): Promise<boolean> {
  return executeWithSqliteBudget(async () => {
    // 1. Fetch V1 record
    const v1Res = await client.execute({
      sql: `SELECT * FROM rate_limit_records WHERE key = ?;`,
      args: [keyV1],
    });
    const v1 = v1Res.rows[0];
    if (!v1) {
      return false; // Nothing to merge
    }

    // 2. Ensure V2 record exists
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, first_failure_at, blocked_until, generation, updated_at)
            VALUES (?, ?, 0, NULL, NULL, 1, ?)
            ON CONFLICT(key) DO UPDATE SET updated_at = ?;`,
      args: [keyV2, currVersion, now, now],
    });

    // 3. Fetch V2 record
    const v2Res = await client.execute({
      sql: `SELECT * FROM rate_limit_records WHERE key = ?;`,
      args: [keyV2],
    });
    const v2 = v2Res.rows[0];

    const v1Gen = Number(v1.generation);
    const v2Gen = Number(v2.generation);
    const v1Failures = Number(v1.failures);
    const v2Failures = Number(v2.failures);
    const v1First = v1.first_failure_at ? Number(v1.first_failure_at) : null;
    const v2First = v2.first_failure_at ? Number(v2.first_failure_at) : null;
    const v1Blocked = v1.blocked_until ? Number(v1.blocked_until) : null;
    const v2Blocked = v2.blocked_until ? Number(v2.blocked_until) : null;

    // 4. Single-pass atomic merge on reservations:
    // Transforms reservations without double transformation!
    await client.execute({
      sql: `UPDATE rate_limit_reservations
            SET
              snapshot_ip_generation = CASE
                WHEN key = ? THEN ? + snapshot_ip_generation
                ELSE ? + snapshot_ip_generation
              END,
              key = ?
            WHERE key IN (?, ?);`,
      args: [keyV1, v2Gen, v1Gen, keyV2, keyV1, keyV2],
    });

    // 5. Single-pass deterministic merge on rate_limit_records
    await client.execute({
      sql: `UPDATE rate_limit_records
            SET
              generation = ?,
              failures = CASE
                WHEN (? IS NOT NULL AND (? - ?) <= 900000) AND (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN MIN(10, ? + ?)
                WHEN (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN ?
                WHEN (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN ?
                ELSE 0
              END,
              first_failure_at = CASE
                WHEN (? IS NOT NULL AND (? - ?) <= 900000) AND (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN MIN(?, ?)
                WHEN (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN ?
                WHEN (? IS NOT NULL AND (? - ?) <= 900000)
                  THEN ?
                ELSE NULL
              END,
              blocked_until = CASE
                WHEN (? IS NOT NULL AND ? > ?) AND (? IS NOT NULL AND ? > ?)
                  THEN MAX(?, ?)
                WHEN (? IS NOT NULL AND ? > ?)
                  THEN ?
                WHEN (? IS NOT NULL AND ? > ?)
                  THEN ?
                ELSE NULL
              END,
              updated_at = ?
            WHERE key = ?;`,
      args: [
        v1Gen + v2Gen,
        // Failures case
        v1First, now, v1First, v2First, now, v2First,
        v1Failures, v2Failures,
        v1First, now, v1First,
        v1Failures,
        v2First, now, v2First,
        v2Failures,
        // First_failure_at case
        v1First, now, v1First, v2First, now, v2First,
        v1First, v2First,
        v1First, now, v1First,
        v1First,
        v2First, now, v2First,
        v2First,
        // Blocked_until case
        v1Blocked, v1Blocked, now, v2Blocked, v2Blocked, now,
        v1Blocked, v2Blocked,
        v1Blocked, v1Blocked, now,
        v1Blocked,
        v2Blocked, v2Blocked, now,
        v2Blocked,
        now,
        keyV2,
      ],
    });

    // 6. Safely delete old V1 record
    await client.execute({
      sql: `DELETE FROM rate_limit_records WHERE key = ?;`,
      args: [keyV1],
    });

    return true;
  });
}
