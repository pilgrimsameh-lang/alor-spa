import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import { getServerConfig } from '../config';
import * as schema from './schema';

export * from './schema';

export interface DatabaseClient {
  execute(query: string | { sql: string; args?: any[] }): Promise<{ rows: any[] }>;
  raw?: any;
}

export function createD1ClientWrapper(d1: D1Database): DatabaseClient {
  return {
    raw: d1,
    async execute(query: string | { sql: string; args?: any[] }): Promise<{ rows: any[] }> {
      const sql = typeof query === 'string' ? query : query.sql;
      const args = typeof query === 'string' ? [] : (query.args || []);
      const stmt = d1.prepare(sql);
      const bound = args && args.length > 0 ? stmt.bind(...args) : stmt;
      const result = await bound.all();
      return { rows: (result.results as any[]) || [] };
    },
  };
}

export function getDbFromD1(d1: D1Database): {
  client: DatabaseClient;
  db: DrizzleD1Database<typeof schema>;
} {
  const db = drizzleD1(d1, { schema });
  const client = createD1ClientWrapper(d1);
  return { client, db };
}

let clientInstance: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;

/**
 * Initializes and returns the LibSQL database and client instance.
 * Used during static build time and local Node.js scripting.
 */
export function getDb(customPath?: string): { client: Client; db: LibSQLDatabase<typeof schema> } {
  if (clientInstance && dbInstance && !customPath) {
    return { client: clientInstance, db: dbInstance };
  }

  const config = getServerConfig();
  const dbPath = customPath || config.DB_PATH;

  // If local file path, ensure parent directory exists (Node environment only)
  try {
    if (typeof fs?.existsSync === 'function') {
      if (dbPath.startsWith('file:') || !dbPath.includes('://')) {
        const rawPath = dbPath.replace(/^file:/, '');
        const resolvedPath = path.isAbsolute(rawPath)
          ? rawPath
          : path.resolve(process.cwd(), rawPath);
        const parentDir = path.dirname(resolvedPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      }
    }
  } catch {
    // Non-filesystem environments
  }

  // Construct proper LibSQL local file URL
  let connectionUrl = dbPath;
  if (!connectionUrl.includes('://')) {
    const absolutePath = path.resolve ? path.resolve(process.cwd(), dbPath) : dbPath;
    connectionUrl = `file:${absolutePath}`;
  }

  const client = createClient({ url: connectionUrl });

  // Initialize SQLite settings for concurrency and referential integrity
  client.execute('PRAGMA journal_mode = WAL;').catch(() => {});
  client.execute('PRAGMA foreign_keys = ON;').catch(() => {});
  client.execute('PRAGMA busy_timeout = 5000;').catch(() => {});

  const db = drizzleLibsql(client, { schema });

  if (!customPath) {
    clientInstance = client;
    dbInstance = db;
  }

  return { client, db };
}
