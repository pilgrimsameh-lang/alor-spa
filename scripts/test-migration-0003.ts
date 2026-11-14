import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { runMigrations } from '../src/server/db/migrate';

async function testMigration0003() {
  console.log('================================================================');
  console.log(' ALOR SPA — Migration 0003 Isolation & Verification Suite');
  console.log('================================================================\n');

  const backupDbPath = path.resolve(process.cwd(), 'data/backups/alor_spa_20261106_pre_m4_p1.db');
  const sandboxDbPath = path.resolve(process.cwd(), 'data/test_migration_0003_sandbox.db');

  if (fs.existsSync(sandboxDbPath)) {
    fs.unlinkSync(sandboxDbPath);
  }
  fs.copyFileSync(backupDbPath, sandboxDbPath);
  console.log(`[Setup] Sandboxed DB initialized from backup at: ${sandboxDbPath}`);

  const client = createClient({ url: `file:${sandboxDbPath}` });

  // Record pre-migration counts
  const preCats = Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c);
  const preServices = Number((await client.execute('SELECT COUNT(*) as c FROM services;')).rows[0].c);
  const preSettings = Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c);
  const preWhatsApp = (await client.execute("SELECT value_raw, is_immutable FROM site_settings WHERE key = 'contact.whatsapp';")).rows[0];

  console.log(`Pre-migration state: Categories=${preCats}, Services=${preServices}, Settings=${preSettings}, WhatsApp=${preWhatsApp.value_raw}`);

  // Run migrations
  await runMigrations(sandboxDbPath);
  console.log('✓ Migration executed successfully against sandboxed DB.');

  // 1. Check integrity
  const integrity = await client.execute('PRAGMA integrity_check;');
  console.log('PRAGMA integrity_check:', integrity.rows[0].integrity_check);
  if (integrity.rows[0].integrity_check !== 'ok') {
    throw new Error('Integrity check failed: ' + JSON.stringify(integrity.rows));
  }

  // 2. Check foreign keys
  const fks = await client.execute('PRAGMA foreign_key_check;');
  console.log('PRAGMA foreign_key_check violations count:', fks.rows.length);
  if (fks.rows.length > 0) {
    throw new Error('Foreign key violations found: ' + JSON.stringify(fks.rows));
  }

  // 3. Verify columns in admin_users
  const userCols = (await client.execute('PRAGMA table_info(admin_users);')).rows.map((r: any) => r.name);
  console.log('admin_users columns:', userCols.join(', '));
  if (!userCols.includes('security_generation') || !userCols.includes('login_generation')) {
    throw new Error('Missing generation columns in admin_users!');
  }

  // 4. Verify columns in admin_sessions
  const sessionCols = (await client.execute('PRAGMA table_info(admin_sessions);')).rows.map((r: any) => r.name);
  console.log('admin_sessions columns:', sessionCols.join(', '));
  if (!sessionCols.includes('security_generation')) {
    throw new Error('Missing security_generation column in admin_sessions!');
  }

  // 5. Verify rate_limit_records table exists
  const rlCols = (await client.execute('PRAGMA table_info(rate_limit_records);')).rows.map((r: any) => r.name);
  console.log('rate_limit_records columns:', rlCols.join(', '));
  if (!rlCols.includes('key') || !rlCols.includes('key_version') || !rlCols.includes('generation') || !rlCols.includes('failures')) {
    throw new Error('Missing columns in rate_limit_records!');
  }

  // 6. Verify rate_limit_reservations table exists
  const resCols = (await client.execute('PRAGMA table_info(rate_limit_reservations);')).rows.map((r: any) => r.name);
  console.log('rate_limit_reservations columns:', resCols.join(', '));
  if (!resCols.includes('id') || !resCols.includes('key') || !resCols.includes('lease_expires_at') || !resCols.includes('hard_timeout_at')) {
    throw new Error('Missing columns in rate_limit_reservations!');
  }

  // 7. Test CHECK constraints: negative failures in rate_limit_records
  let caughtNegativeFailures = false;
  try {
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('k1', 1, -1, 1, 1000);`,
      args: [],
    });
  } catch (err: any) {
    if (err.message.includes('CHECK constraint failed')) caughtNegativeFailures = true;
  }
  if (!caughtNegativeFailures) throw new Error('CHECK constraint chk_rate_limit_failures failed to reject -1');
  console.log('✓ CHECK constraint chk_rate_limit_failures properly rejected negative failures.');

  // 8. Test CHECK constraints: generation < 1 in rate_limit_records
  let caughtInvalidGen = false;
  try {
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('k1', 1, 0, 0, 1000);`,
      args: [],
    });
  } catch (err: any) {
    if (err.message.includes('CHECK constraint failed')) caughtInvalidGen = true;
  }
  if (!caughtInvalidGen) throw new Error('CHECK constraint chk_rate_limit_gen failed to reject generation 0');
  console.log('✓ CHECK constraint chk_rate_limit_gen properly rejected generation = 0.');

  // 9. Test CHECK constraints: status != 'ACTIVE' in rate_limit_reservations
  // First insert valid rate limit record
  await client.execute({
    sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('valid_key', 1, 0, 1, 1000);`,
    args: [],
  });

  let caughtInvalidStatus = false;
  try {
    await client.execute({
      sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at) 
            VALUES ('res_invalid', 'valid_key', 1, 'INACTIVE', 1000, 2000, 3000);`,
      args: [],
    });
  } catch (err: any) {
    if (err.message.includes('CHECK constraint failed')) caughtInvalidStatus = true;
  }
  if (!caughtInvalidStatus) throw new Error('CHECK constraint chk_reservations_status failed to reject status != ACTIVE');
  console.log('✓ CHECK constraint chk_reservations_status properly rejected non-ACTIVE status.');

  // 10. Test Foreign Key on rate_limit_reservations: non-existent key
  let caughtFkKey = false;
  try {
    await client.execute('PRAGMA foreign_keys = ON;');
    await client.execute({
      sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at) 
            VALUES ('res_fk', 'non_existent_key', 1, 'ACTIVE', 1000, 2000, 3000);`,
      args: [],
    });
  } catch (err: any) {
    if (err.message.includes('FOREIGN KEY constraint failed')) caughtFkKey = true;
  }
  if (!caughtFkKey) throw new Error('Foreign key enforcement failed to reject non-existent key in reservations');
  console.log('✓ Foreign key correctly rejected reservation with non-existent key.');

  // 11. Test Foreign Key ON DELETE RESTRICT on rate_limit_records
  // Insert valid reservation
  await client.execute({
    sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at) 
          VALUES ('res_valid', 'valid_key', 1, 'ACTIVE', 1000, 2000, 3000);`,
    args: [],
  });

  let caughtRestrict = false;
  try {
    await client.execute(`DELETE FROM rate_limit_records WHERE key = 'valid_key';`);
  } catch (err: any) {
    if (err.message.includes('FOREIGN KEY constraint failed')) caughtRestrict = true;
  }
  if (!caughtRestrict) throw new Error('Foreign key ON DELETE RESTRICT failed to prevent deletion of parent rate limit record');
  console.log('✓ Foreign key ON DELETE RESTRICT prevented deleting rate_limit_record with active reservation.');

  // 12. Verify Post-migration Data Integrity
  const postCats = Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c);
  const postServices = Number((await client.execute('SELECT COUNT(*) as c FROM services;')).rows[0].c);
  const postSettings = Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c);
  const postWhatsApp = (await client.execute("SELECT value_raw, is_immutable FROM site_settings WHERE key = 'contact.whatsapp';")).rows[0];

  if (postCats !== preCats || postServices !== preServices || postSettings !== preSettings) {
    throw new Error('Data count mismatch after migration!');
  }
  if (postWhatsApp.value_raw !== '966553543192' || postWhatsApp.is_immutable !== 1) {
    throw new Error('Official WhatsApp setting corrupted!');
  }
  console.log('✓ All business data & WhatsApp configuration intact.');

  console.log('\n================================================================');
  console.log(' ALL SANDBOX MIGRATION 0003 CHECKS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

testMigration0003().catch((err) => {
  console.error('✗ Migration 0003 test failed:', err);
  process.exit(1);
});
