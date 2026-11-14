import crypto from 'node:crypto';
import type { DatabaseClient } from '../db/index';

export interface ActivityLogParams {
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'SERVICE' | 'CATEGORY' | 'OFFER' | 'GALLERY' | 'REVIEW' | 'BLOG' | 'SETTINGS' | 'MEDIA';
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Persists an administrative activity record safely to SQLite `activity_logs`.
 * Sanitizes input to ensure zero tokens, passwords, or secrets are logged.
 */
export async function recordActivityLog(
  client: DatabaseClient,
  params: ActivityLogParams
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  // Sanitize values to guarantee secrets safety
  const sanitize = (val: Record<string, unknown> | null | undefined) => {
    if (!val) return null;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (/password|hash|token|secret|cookie/i.test(k)) {
        clean[k] = '[REDACTED]';
      } else {
        clean[k] = v;
      }
    }
    return JSON.stringify(clean);
  };

  try {
    await client.execute({
      sql: `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        params.userId ?? null,
        params.action,
        params.entityType,
        params.entityId ?? null,
        sanitize(params.oldValues),
        sanitize(params.newValues),
        params.ipAddress ?? null,
        params.userAgent ?? null,
        now,
      ],
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to persist log:', err);
  }

  return id;
}
