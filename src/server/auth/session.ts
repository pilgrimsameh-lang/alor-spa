import crypto from 'node:crypto';
import type { Client } from '@libsql/client';
import { executeWithSqliteBudget } from '../db/budget';

/**
 * ============================================================================
 * ALOR SPA — Admin Session Engine & Generation Management
 * Dual 7-day absolute / 24-hr sliding idle expiry, instant security revocation
 * ============================================================================
 */

export const SESSION_CONFIG = {
  ABSOLUTE_TIMEOUT_MS: 7 * 24 * 60 * 60 * 1000, // 7 days absolute expiry
  IDLE_TIMEOUT_MS: 24 * 60 * 60 * 1000,          // 24 hours sliding idle window
  COOKIE_NAME: 'alor_admin_session',
} as const;

export interface SessionValidationResult {
  valid: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    roleId: string;
    roleSlug: string;
    permissions: string[];
    securityGeneration: number;
  };
  session?: {
    id: string;
    userId: string;
    securityGeneration: number;
    createdAt: number;
    lastActivityAt: number;
    expiresAt: number;
  };
  reason?:
    | 'TOKEN_MISSING'
    | 'NOT_FOUND_OR_REVOKED'
    | 'EXPIRED_ABSOLUTE'
    | 'EXPIRED_IDLE'
    | 'USER_INACTIVE'
    | 'SECURITY_REVOKED';
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Creates a new authenticated session in SQLite with cryptographic SHA-256 token hashing.
 */
export async function createSession(
  client: Client,
  params: {
    userId: string;
    clientIp?: string | null;
    userAgent?: string | null;
    now?: number;
  }
): Promise<{ sessionId: string; rawToken: string }> {
  const now = params.now ?? Date.now();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const sessionId = crypto.randomUUID();
  const expiresAt = now + SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS;

  return executeWithSqliteBudget(async () => {
    // Read current user security_generation
    const userRes = await client.execute({
      sql: `SELECT security_generation, is_active FROM admin_users WHERE id = ?;`,
      args: [params.userId],
    });
    const user = userRes.rows[0];
    if (!user || Number(user.is_active) !== 1) {
      throw new Error('Cannot create session for non-existent or inactive user.');
    }

    const secGen = Number(user.security_generation);

    await client.execute({
      sql: `INSERT INTO admin_sessions (id, user_id, token_hash, security_generation, ip_address, user_agent, created_at, last_activity_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        sessionId,
        params.userId,
        tokenHash,
        secGen,
        params.clientIp ?? null,
        params.userAgent ?? null,
        now,
        now,
        expiresAt,
      ],
    });

    return { sessionId, rawToken };
  });
}

/**
 * Validates a session token against SQLite:
 * 1. Hashes token and queries session record.
 * 2. Checks absolute 7-day expiration.
 * 3. Checks 24-hour idle expiration.
 * 4. Checks user active status.
 * 5. Generation Management: checks `session.security_generation === user.security_generation`.
 * 6. If valid: slides the idle window (`last_activity_at = now`).
 */
export async function validateSession(
  client: Client,
  rawToken: string,
  now = Date.now()
): Promise<SessionValidationResult> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'TOKEN_MISSING' };
  }

  const tokenHash = hashSessionToken(rawToken);

  return executeWithSqliteBudget(async () => {
    const res = await client.execute({
      sql: `SELECT 
              s.id as session_id,
              s.user_id,
              s.security_generation as session_sec_gen,
              s.created_at as session_created_at,
              s.last_activity_at,
              s.expires_at,
              s.revoked_at,
              u.id as user_id,
              u.username,
              u.email,
              u.full_name,
              u.is_active,
              u.role_id,
              u.security_generation as user_sec_gen,
              r.slug as role_slug,
              r.permissions as role_permissions
            FROM admin_sessions s
            INNER JOIN admin_users u ON s.user_id = u.id
            INNER JOIN admin_roles r ON u.role_id = r.id
            WHERE s.token_hash = ?;`,
      args: [tokenHash],
    });

    const row = res.rows[0];
    if (!row) {
      return { valid: false, reason: 'NOT_FOUND_OR_REVOKED' };
    }

    // Generation Management: Verify security generation matches exactly
    const sessionSecGen = Number(row.session_sec_gen);
    const userSecGen = Number(row.user_sec_gen);
    if (sessionSecGen !== userSecGen) {
      // Security generation changed (e.g. password reset or global logout)
      await client.execute({
        sql: `UPDATE admin_sessions SET revoked_at = ? WHERE id = ?;`,
        args: [now, row.session_id],
      });
      return { valid: false, reason: 'SECURITY_REVOKED' };
    }

    if (row.revoked_at) {
      return { valid: false, reason: 'NOT_FOUND_OR_REVOKED' };
    }

    const expiresAt = Number(row.expires_at);
    if (expiresAt <= now) {
      await client.execute({
        sql: `UPDATE admin_sessions SET revoked_at = ? WHERE id = ?;`,
        args: [now, row.session_id],
      });
      return { valid: false, reason: 'EXPIRED_ABSOLUTE' };
    }

    const lastActivity = Number(row.last_activity_at);
    if (now - lastActivity > SESSION_CONFIG.IDLE_TIMEOUT_MS) {
      await client.execute({
        sql: `UPDATE admin_sessions SET revoked_at = ? WHERE id = ?;`,
        args: [now, row.session_id],
      });
      return { valid: false, reason: 'EXPIRED_IDLE' };
    }

    if (Number(row.is_active) !== 1) {
      await client.execute({
        sql: `UPDATE admin_sessions SET revoked_at = ? WHERE id = ?;`,
        args: [now, row.session_id],
      });
      return { valid: false, reason: 'USER_INACTIVE' };
    }

    // Slide idle window (only if more than 60 seconds have elapsed since last write to avoid excess I/O)
    if (now - lastActivity > 60000) {
      await client.execute({
        sql: `UPDATE admin_sessions SET last_activity_at = ? WHERE id = ?;`,
        args: [now, row.session_id],
      });
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = typeof row.role_permissions === 'string'
        ? JSON.parse(row.role_permissions)
        : (row.role_permissions as string[]) || [];
    } catch {
      parsedPermissions = [];
    }

    return {
      valid: true,
      user: {
        id: String(row.user_id),
        username: String(row.username),
        email: String(row.email),
        fullName: String(row.full_name),
        roleId: String(row.role_id),
        roleSlug: String(row.role_slug),
        permissions: parsedPermissions,
        securityGeneration: userSecGen,
      },
      session: {
        id: String(row.session_id),
        userId: String(row.user_id),
        securityGeneration: sessionSecGen,
        createdAt: Number(row.session_created_at),
        lastActivityAt: now,
        expiresAt,
      },
    };
  });
}

/**
 * Revokes a single session.
 */
export async function revokeSession(
  client: Client,
  sessionId: string,
  now = Date.now()
): Promise<void> {
  await executeWithSqliteBudget(async () => {
    await client.execute({
      sql: `UPDATE admin_sessions SET revoked_at = ? WHERE id = ?;`,
      args: [now, sessionId],
    });
  });
}

/**
 * Revokes ALL sessions for a given user by advancing user.security_generation.
 * All existing sessions become immediately invalid on their next verification.
 */
export async function revokeAllUserSessions(
  client: Client,
  userId: string,
  now = Date.now()
): Promise<void> {
  await executeWithSqliteBudget(async () => {
    // 1. Advance security_generation on user
    await client.execute({
      sql: `UPDATE admin_users 
            SET security_generation = security_generation + 1,
                updated_at = ?
            WHERE id = ?;`,
      args: [now, userId],
    });

    // 2. Mark existing sessions as revoked in database
    await client.execute({
      sql: `UPDATE admin_sessions
            SET revoked_at = ?
            WHERE user_id = ? AND revoked_at IS NULL;`,
      args: [now, userId],
    });
  });
}
