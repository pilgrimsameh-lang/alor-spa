import path from 'node:path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getDb } from './index';

/**
 * Runs Drizzle database migrations against the configured SQLite database.
 * Supports custom database paths for isolated test environments.
 */
export async function runMigrations(customDbPath?: string): Promise<void> {
  const { db, client } = getDb(customDbPath);

  // Guarantee WAL mode and foreign key constraints on target database
  await client.execute('PRAGMA journal_mode = WAL;');
  await client.execute('PRAGMA foreign_keys = ON;');
  await client.execute('PRAGMA busy_timeout = 5000;');

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  await migrate(db, { migrationsFolder });
}

// Execute directly if run via CLI (e.g. `npx tsx src/server/db/migrate.ts`)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('migrate.ts') || 
  process.argv[1].endsWith('migrate.js')
);

if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.log('✓ [ALOR SPA] Database migrations executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ [ALOR SPA] Database migration failed:', err);
      process.exit(1);
    });
}
