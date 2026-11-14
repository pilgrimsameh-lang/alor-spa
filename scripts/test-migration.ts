import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { runMigrations } from '../src/server/db/migrate';

async function testMigration() {
  console.log('--- TESTING MIGRATION ON SEPARATE DATABASE COPY ---');
  
  const originalBackup = path.resolve(process.cwd(), 'data/backups/alor_spa_pre_m4_p2_20261106.db');
  const testDbPath = path.resolve(process.cwd(), 'data/test_migration_sandbox.db');

  // 1. Copy backup to sandbox DB
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  fs.copyFileSync(originalBackup, testDbPath);
  console.log('✓ Sandbox DB initialized from pre-migration backup.');

  // 2. Run migrations on sandbox
  await runMigrations(testDbPath);
  console.log('✓ Migration executed against sandbox DB.');

  // 3. Connect and verify PRAGMAs
  const client = createClient({ url: `file:${testDbPath}` });

  const integrity = await client.execute('PRAGMA integrity_check;');
  console.log('Integrity check result:', integrity.rows[0].integrity_check);
  if (integrity.rows[0].integrity_check !== 'ok') {
    throw new Error('Integrity check failed: ' + JSON.stringify(integrity.rows));
  }
  console.log('✓ PRAGMA integrity_check passed: ok');

  const fkCheck = await client.execute('PRAGMA foreign_key_check;');
  if (fkCheck.rows.length > 0) {
    throw new Error('Foreign key violations: ' + JSON.stringify(fkCheck.rows));
  }
  console.log('✓ PRAGMA foreign_key_check passed: 0 violations');

  // 4. Verify columns
  const cols = await client.execute('PRAGMA table_info(admin_users);');
  const colNames = cols.rows.map((r: any) => r.name);
  console.log('admin_users columns:', colNames.join(', '));
  if (!colNames.includes('failed_login_attempts') || !colNames.includes('locked_until')) {
    throw new Error('Missing expected columns in admin_users!');
  }
  console.log('✓ Columns failed_login_attempts and locked_until exist.');

  // 5. Verify CHECK constraint rejects negative failed_login_attempts
  let checkPassed = false;
  try {
    await client.execute({
      sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, failed_login_attempts, created_at, updated_at) 
            VALUES ('test-chk', 'role_super_admin', 'test_chk', 'chk@test.com', 'dummy_hash', 'Test Check', -1, 1000, 1000);`,
      args: [],
    });
  } catch (err: any) {
    if (err.message && (err.message.includes('CHECK constraint failed') || err.message.includes('chk_admin_users_failed_attempts'))) {
      checkPassed = true;
      console.log('✓ CHECK constraint successfully prevented negative failed_login_attempts (-1):', err.message);
    } else {
      throw err;
    }
  }

  if (!checkPassed) {
    throw new Error('FAILED: CHECK constraint did not prevent negative failed_login_attempts!');
  }

  // 6. Verify inserting valid values works
  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, failed_login_attempts, created_at, updated_at) 
          VALUES ('test-chk', 'role_super_admin', 'test_chk', 'chk@test.com', 'dummy_hash', 'Test Check', 0, 1000, 1000);`,
    args: [],
  });
  console.log('✓ Valid row insertion with failed_login_attempts = 0 succeeded.');

  // Clean up test row
  await client.execute(`DELETE FROM admin_users WHERE id = 'test-chk';`);

  // Verify site settings unchanged
  const wa = await client.execute("SELECT value_raw FROM site_settings WHERE key = 'contact.whatsapp';");
  console.log('WhatsApp setting:', wa.rows[0]?.value_raw);
  if (wa.rows[0]?.value_raw !== '966553543192') {
    throw new Error('WhatsApp setting corrupted or altered!');
  }
  console.log('✓ Site settings and WhatsApp number verified intact: 966553543192');

  console.log('\n=============================================');
  console.log('ALL MIGRATION SANDBOX CHECKS PASSED WITH 100% SUCCESS');
  console.log('=============================================\n');
}

testMigration().catch((err) => {
  console.error('✗ Migration test failed:', err);
  process.exit(1);
});
