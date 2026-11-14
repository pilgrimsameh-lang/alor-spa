import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getServerConfig } from '../config';
import * as schema from './schema';

export * from './schema';

let clientInstance: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;

/**
 * Initializes and returns the LibSQL database and client instance.
 * Automatically ensures the database directory exists, enables SQLite WAL mode,
 * and activates strict foreign-key enforcement.
 */
export function getDb(customPath?: string): { client: Client; db: LibSQLDatabase<typeof schema> } {
  if (clientInstance && dbInstance && !customPath) {
    return { client: clientInstance, db: dbInstance };
  }

  const config = getServerConfig();
  const dbPath = customPath || config.DB_PATH;

  // If local file path, ensure parent directory exists
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

  // Construct proper LibSQL local file URL
  let connectionUrl = dbPath;
  if (!connectionUrl.includes('://')) {
    const absolutePath = path.resolve(process.cwd(), dbPath);
    // LibSQL client handles file: paths cleanly
    connectionUrl = `file:${absolutePath}`;
  }

  const client = createClient({ url: connectionUrl });

  // Initialize SQLite settings for concurrency and referential integrity
  // Note: PRAGMAs execute asynchronously on client initialization
  client.execute('PRAGMA journal_mode = WAL;').catch(() => {});
  client.execute('PRAGMA foreign_keys = ON;').catch(() => {});
  client.execute('PRAGMA busy_timeout = 5000;').catch(() => {});

  const db = drizzle(client, { schema });

  if (!customPath) {
    clientInstance = client;
    dbInstance = db;
  }

  return { client, db };
}

export const db = getDb().db;
export const client = getDb().client;
