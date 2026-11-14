import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

async function backup() {
  const dbPath = path.resolve('data/alor_spa.db');
  const backupDir = path.resolve('data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const client = createClient({ url: `file:${dbPath}` });
  await client.execute('PRAGMA wal_checkpoint(FULL);');
  const check = await client.execute('PRAGMA integrity_check;');
  console.log('Pre-backup integrity check:', check.rows[0]);
  if (check.rows[0].integrity_check !== 'ok') {
    throw new Error('Database integrity check failed!');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(backupDir, `alor_spa_backup_content_${timestamp}.db`);
  fs.copyFileSync(dbPath, backupFile);
  console.log(`✓ Backup successfully created at: ${backupFile}`);
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
