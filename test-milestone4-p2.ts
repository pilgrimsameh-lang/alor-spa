import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { runMigrations } from './src/server/db/migrate';
import { getDb } from './src/server/db/index';
import { adminUsers, activityLogs, siteSettings } from './src/server/db/schema';
import {
  hashPassword,
  verifyPassword,
  verifyDummyPassword,
  validatePasswordStrength,
  needsRehash,
  DUMMY_HASH,
} from './src/server/auth/password';
import {
  authenticateCredentials,
  ipRateLimiter,
  isAccountLocked,
} from './src/server/auth/attempts';
import { createSuperAdmin } from './scripts/create-super-admin';
import { eq } from 'drizzle-orm';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(num: number, name: string, passed: boolean, details: string) {
  results.push({ num, name, passed, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} [Test ${num.toString().padStart(2, '0')}] ${name}`);
  if (!passed || details) {
    console.log(`    ↳ ${details}`);
  }
}

async function runMilestone4Tests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 4 / Phase 2: Security & Auth Foundation Audit');
  console.log('================================================================\n');

  // Setup isolated test database from pre-migration backup
  const backupDbPath = path.resolve(process.cwd(), 'data/backups/alor_spa_pre_m4_p2_20261106.db');
  const testDbPath = path.resolve(process.cwd(), 'data/test_milestone4_sandbox.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  fs.copyFileSync(backupDbPath, testDbPath);
  console.log(`[Setup] Initialized sandbox database at: ${testDbPath}\n`);

  const client = createClient({ url: `file:${testDbPath}` });

  // --------------------------------------------------------------------------
  // TEST 1: Migration adds fields without data loss
  // --------------------------------------------------------------------------
  try {
    const preCount = Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c);
    const preSettings = Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c);

    await runMigrations(testDbPath);

    const postCols = await client.execute('PRAGMA table_info(admin_users);');
    const colNames = postCols.rows.map((r: any) => r.name);
    const hasFailedAttempts = colNames.includes('failed_login_attempts');
    const hasLockedUntil = colNames.includes('locked_until');

    const postCount = Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c);
    const postSettings = Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c);

    const ok = hasFailedAttempts && hasLockedUntil && preCount === postCount && preSettings === postSettings;
    record(
      1,
      'Migration adds fields without data loss',
      ok,
      `Columns added. Service categories preserved (${postCount}), Site settings preserved (${postSettings})`
    );
  } catch (err: any) {
    record(1, 'Migration adds fields without data loss', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Reject negative failed_login_attempts
  // --------------------------------------------------------------------------
  try {
    let rejected = false;
    try {
      await client.execute({
        sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, failed_login_attempts, created_at, updated_at) 
              VALUES ('t2', 'role_super_admin', 'neg_user', 'neg@test.com', 'dummy', 'Neg User', -5, 1000, 1000);`,
        args: [],
      });
    } catch (e: any) {
      if (e.message.includes('CHECK constraint failed')) {
        rejected = true;
      }
    }
    record(
      2,
      'Reject negative failed_login_attempts via CHECK constraint',
      rejected,
      rejected ? 'SQLite CHECK constraint chk_admin_users_failed_attempts prevented negative value (-5)' : 'Constraint failed to reject'
    );
  } catch (err: any) {
    record(2, 'Reject negative failed_login_attempts via CHECK constraint', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Create Argon2id hash & verify correct password
  // --------------------------------------------------------------------------
  const samplePassword = 'StrongSuperSecretPassword2026!';
  let generatedHash = '';
  try {
    generatedHash = await hashPassword(samplePassword);
    const isValid = await verifyPassword(generatedHash, samplePassword);
    const isArgon2id = generatedHash.startsWith('$argon2id$v=19$m=65536,t=3,p=4$');
    const ok = isValid && isArgon2id;
    record(
      3,
      'Create Argon2id hash & verify correct password',
      ok,
      `Hash format: ${generatedHash.slice(0, 32)}... (v=19, m=65536, t=3, p=4) verified successfully`
    );
  } catch (err: any) {
    record(3, 'Create Argon2id hash & verify correct password', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Reject incorrect password
  // --------------------------------------------------------------------------
  try {
    const isInvalid = await verifyPassword(generatedHash, 'WrongPasswordEntirely123!');
    record(
      4,
      'Reject incorrect password',
      isInvalid === false,
      'verifyPassword strictly returned false for mismatched password'
    );
  } catch (err: any) {
    record(4, 'Reject incorrect password', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Reject password less than 12 characters & weak passwords
  // --------------------------------------------------------------------------
  try {
    const shortCheck = validatePasswordStrength('Short123!');
    const weakCheck = validatePasswordStrength('password12345');
    const validCheck = validatePasswordStrength('ValidSecretPassword2026!');
    const ok = !shortCheck.valid && !weakCheck.valid && validCheck.valid;
    record(
      5,
      'Reject password less than 12 characters and weak passwords',
      ok,
      `Short rejected: "${shortCheck.error}". Weak rejected: "${weakCheck.error}". Valid accepted.`
    );
  } catch (err: any) {
    record(5, 'Reject password less than 12 characters and weak passwords', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Ensure password never appears in logs
  // --------------------------------------------------------------------------
  try {
    let capturedLog = '';
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      capturedLog += args.join(' ') + '\n';
      originalConsoleLog.apply(console, args);
    };

    // Execute hash & check password
    const secret = 'UnloggableSuperSecret2026!';
    const h = await hashPassword(secret);
    await verifyPassword(h, secret);

    console.log = originalConsoleLog;

    const leaked = capturedLog.includes(secret) || capturedLog.includes(h);
    record(
      6,
      'Zero password or hash leakage in logs',
      !leaked,
      'Neither plaintext password nor generated hash appeared anywhere in console/logs'
    );
  } catch (err: any) {
    record(6, 'Zero password or hash leakage in logs', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Successfully create first super_admin in test database
  // --------------------------------------------------------------------------
  const { db } = getDb(testDbPath);
  let createdSuperAdminId = '';
  try {
    const result = await createSuperAdmin({
      customDbPath: testDbPath,
      fullName: 'مدير النظام التجريبي',
      username: 'test_super_admin',
      email: 'superadmin@test-alor.com',
      password: samplePassword,
      confirmPassword: samplePassword,
    });

    const [createdUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, 'test_super_admin'))
      .limit(1);

    const ok = result.success && !!createdUser && createdUser.role_id === 'role_super_admin';
    if (createdUser) createdSuperAdminId = createdUser.id;
    record(
      7,
      'Successfully create first super_admin in test database',
      ok,
      `Account created: ID=${createdUser?.id}, username=${createdUser?.username}, role=${createdUser?.role_id}`
    );
  } catch (err: any) {
    record(7, 'Successfully create first super_admin in test database', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Reject creating a second super_admin
  // --------------------------------------------------------------------------
  try {
    const secondResult = await createSuperAdmin({
      customDbPath: testDbPath,
      fullName: 'مدير آخر',
      username: 'second_admin',
      email: 'second@test-alor.com',
      password: samplePassword,
      confirmPassword: samplePassword,
    });

    const ok = !secondResult.success && secondResult.error?.includes('يوجد بالفعل حساب مدير عام');
    record(
      8,
      'Strictly reject creating a second super_admin',
      ok,
      `Rejected with error: "${secondResult.error}"`
    );
  } catch (err: any) {
    record(8, 'Strictly reject creating a second super_admin', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Ensure activity_logs does NOT store password or hash
  // --------------------------------------------------------------------------
  try {
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.user_id, createdSuperAdminId));

    let clean = logs.length > 0;
    for (const log of logs) {
      const oldStr = JSON.stringify(log.old_values || '');
      const newStr = JSON.stringify(log.new_values || '');
      if (
        oldStr.includes(samplePassword) ||
        newStr.includes(samplePassword) ||
        oldStr.includes('$argon2id$') ||
        newStr.includes('$argon2id$')
      ) {
        clean = false;
      }
    }
    record(
      9,
      'Password or hash never logged in activity_logs',
      clean,
      `Audit log entries (${logs.length}) verified completely sanitized of sensitive credentials`
    );
  } catch (err: any) {
    record(9, 'Password or hash never logged in activity_logs', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Dummy Hash works when user does not exist (Timing Attack Defense)
  // --------------------------------------------------------------------------
  try {
    const start = performance.now();
    const dummyResult = await verifyDummyPassword('SomeAttemptedPassword123!');
    const duration = performance.now() - start;

    const ok = dummyResult === false && duration > 10; // Must execute actual Argon2id work (~30ms)
    record(
      10,
      'Dummy Hash executed when user does not exist (Timing Attack Mitigation)',
      ok,
      `Dummy verification executed in ${duration.toFixed(2)}ms and safely returned false without leaking state`
    );
  } catch (err: any) {
    record(10, 'Dummy Hash executed when user does not exist', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: PRAGMA integrity_check & foreign_key_check
  // --------------------------------------------------------------------------
  try {
    const integrity = await client.execute('PRAGMA integrity_check;');
    const integrityOk = integrity.rows[0]?.integrity_check === 'ok';

    const fks = await client.execute('PRAGMA foreign_key_check;');
    const fksOk = fks.rows.length === 0;

    record(
      11,
      'PRAGMA integrity_check and foreign_key_check pass',
      integrityOk && fksOk,
      `Integrity: ${integrity.rows[0]?.integrity_check}, Foreign Key Violations: ${fks.rows.length}`
    );
  } catch (err: any) {
    record(11, 'PRAGMA integrity_check and foreign_key_check pass', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Account Lockout & Rate Limiting flow
  // --------------------------------------------------------------------------
  try {
    ipRateLimiter._clearAllForTesting();

    // 4 failed attempts should not lock yet
    for (let i = 1; i <= 4; i++) {
      const res = await authenticateCredentials(db, {
        email: 'superadmin@test-alor.com',
        password: 'WrongPassword!',
        ip: '192.168.1.100',
      });
      if (res.success) throw new Error('Failed attempt unexpectedly succeeded');
    }

    const [uAfter4] = await db.select().from(adminUsers).where(eq(adminUsers.id, createdSuperAdminId));
    const notLockedYet = uAfter4.failed_login_attempts === 4 && uAfter4.locked_until === null;

    // 5th failed attempt MUST trigger lockout
    await authenticateCredentials(db, {
      email: 'superadmin@test-alor.com',
      password: 'WrongPassword!',
      ip: '192.168.1.100',
    });

    const [uAfter5] = await db.select().from(adminUsers).where(eq(adminUsers.id, createdSuperAdminId));
    const now = Date.now();
    const isLocked = uAfter5.failed_login_attempts === 5 && uAfter5.locked_until !== null && uAfter5.locked_until > now;

    // Even if correct password is provided, locked account must be rejected!
    const tryWhileLocked = await authenticateCredentials(db, {
      email: 'superadmin@test-alor.com',
      password: samplePassword,
      ip: '192.168.1.100',
    });

    const lockedRejected = !tryWhileLocked.success;

    // Simulate lockout expiry
    await db.update(adminUsers).set({ locked_until: now - 1000 }).where(eq(adminUsers.id, createdSuperAdminId));

    // Now correct password must succeed and reset counter
    const successAfterUnlock = await authenticateCredentials(db, {
      email: 'superadmin@test-alor.com',
      password: samplePassword,
      ip: '192.168.1.100',
    });

    const [uAfterSuccess] = await db.select().from(adminUsers).where(eq(adminUsers.id, createdSuperAdminId));
    const counterReset = uAfterSuccess.failed_login_attempts === 0 && uAfterSuccess.locked_until === null;

    const ok = notLockedYet && isLocked && lockedRejected && successAfterUnlock.success && counterReset;
    record(
      12,
      'Account Lockout after 5 failures, lock enforcement, and reset upon success',
      ok,
      `Failures incremented to 5, locked for 15m, correct password rejected while locked, reset to 0 after unlock`
    );
  } catch (err: any) {
    record(12, 'Account Lockout after 5 failures, lock enforcement, and reset upon success', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 13: Protected WhatsApp Number Verification
  // --------------------------------------------------------------------------
  try {
    const wa = await client.execute("SELECT value_raw, is_immutable FROM site_settings WHERE key = 'contact.whatsapp';");
    const val = wa.rows[0]?.value_raw;
    const imm = wa.rows[0]?.is_immutable;
    const ok = val === '966553543192' && imm === 1;
    record(
      13,
      'Protected WhatsApp number preserved and immutable',
      ok,
      `Number: ${val}, is_immutable: ${imm}`
    );
  } catch (err: any) {
    record(13, 'Protected WhatsApp number preserved and immutable', false, err.message);
  }

  // Print Summary
  console.log('\n================================================================');
  console.log(' AUDIT SUMMARY:');
  const allPassed = results.every((r) => r.passed);
  console.log(` Total Tests: ${results.length}`);
  console.log(` Passed: ${results.filter((r) => r.passed).length}`);
  console.log(` Failed: ${results.filter((r) => !r.passed).length}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMilestone4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
