import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

async function backupDb() {
  const dbPath = path.resolve(process.cwd(), 'data/alor_spa.db');
  const backupDir = path.resolve(process.cwd(), 'data/backups');
  const timestamp = '20261106_pre_m4_p1';
  const backupFile = path.resolve(backupDir, `alor_spa_${timestamp}.db`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Checkpoint WAL to ensure all data is in the main db file
  const client = createClient({ url: `file:${dbPath}` });
  await client.execute('PRAGMA wal_checkpoint(FULL);');
  
  // Verify integrity before backup
  const check = await client.execute('PRAGMA integrity_check;');
  console.log('Pre-backup integrity check:', check.rows[0].integrity_check);
  if (check.rows[0].integrity_check !== 'ok') {
    throw new Error('Database integrity check failed before backup!');
  }

  // Also query count of categories, services, site_settings
  const catCount = await client.execute('SELECT COUNT(*) as c FROM service_categories;');
  const srvCount = await client.execute('SELECT COUNT(*) as c FROM services;');
  const setVal = await client.execute("SELECT value_raw FROM site_settings WHERE key = 'contact.whatsapp';");

  console.log(`Pre-backup stats: categories=${catCount.rows[0].c}, services=${srvCount.rows[0].c}, whatsapp=${setVal.rows[0]?.value_raw}`);

  fs.copyFileSync(dbPath, backupFile);
  console.log(`✓ Backup successfully created at: ${backupFile}`);
}

backupDb().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
