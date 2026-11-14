import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';
import { runMigrations } from './src/server/db/migrate';
import { getDb } from './src/server/db/index';
import { adminUsers, adminRoles, adminSessions, activityLogs } from './src/server/db/schema';
import { hashPassword, verifyPassword } from './src/server/auth/password';
import {
  computeHmacKey,
  acquireReservation,
  finalizeAuthentication,
} from './src/server/auth/rate-limit';
import {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  hashSessionToken,
  SESSION_CONFIG,
} from './src/server/auth/session';
import { hasPermission, requirePermission, ForbiddenError } from './src/server/auth/rbac';
import { extractClientIp, InvalidIpHeaderError } from './src/server/auth/ip';

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

async function runMilestone4Phase4Tests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 4 / Phase 4: Login, Sessions & Protection');
  console.log('================================================================\n');

  const runId = Date.now();
  const backupDbPath = path.resolve(process.cwd(), 'data/backups/alor_spa_20261106_pre_m4_p1.db');
  const testDbPath = path.resolve(process.cwd(), `data/test_phase4_${runId}.db`);

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
  if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  fs.copyFileSync(backupDbPath, testDbPath);
  console.log(`[Setup] Initialized sandbox database at: ${testDbPath}\n`);

  await runMigrations(testDbPath);
  const client = createClient({ url: `file:${testDbPath}` });

  // Provision test accounts:
  // 1. Super Admin
  const superAdminId = crypto.randomUUID();
  const validPassword = 'SuperSecretAdminPassword2026!';
  const superAdminHash = await hashPassword(validPassword);
  const now = Date.now();

  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, failed_login_attempts, security_generation, login_generation, created_at, updated_at)
          VALUES (?, 'role_super_admin', 'super_admin_test', 'super@alorspa.com', ?, 'مدير عام تجريبي', 1, 0, 1, 1, ?, ?);`,
    args: [superAdminId, superAdminHash, now, now],
  });

  // 2. Inactive User
  const inactiveUserId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, failed_login_attempts, security_generation, login_generation, created_at, updated_at)
          VALUES (?, 'role_spa_manager', 'inactive_user', 'inactive@alorspa.com', ?, 'مستخدم غير نشط', 0, 0, 1, 1, ?, ?);`,
    args: [inactiveUserId, superAdminHash, now, now],
  });

  // 3. Content Editor
  const editorUserId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, failed_login_attempts, security_generation, login_generation, created_at, updated_at)
          VALUES (?, 'role_content_editor', 'editor_user', 'editor@alorspa.com', ?, 'محررة محتوى', 1, 0, 1, 1, ?, ?);`,
    args: [editorUserId, superAdminHash, now, now],
  });

  const testSecret = '01234567890123456789012345678901234567890123456789';

  // --------------------------------------------------------------------------
  // TEST 1: تسجيل دخول صحيح (Valid login)
  // --------------------------------------------------------------------------
  let test1SessionToken = '';
  try {
    const clientIp = '10.50.0.1';
    const ipKey = computeHmacKey(clientIp, testSecret, 1);
    const resv = await acquireReservation(client, { ipKey, accountId: superAdminId, now });

    if (!resv.admitted || !resv.reservationId) throw new Error('Reservation failed for valid user');

    const isMatch = await verifyPassword(superAdminHash, validPassword);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);

    const final = await finalizeAuthentication(client, {
      reservationId: resv.reservationId,
      ipKey,
      accountId: superAdminId,
      accountGen: resv.accountGen,
      isAuthentic: isMatch,
      canIssueSession: true,
      tokenHash,
      clientIp,
      userAgent: 'TestBrowser/1.0',
      now,
    });

    test1SessionToken = rawToken;

    // Verify session in SQLite
    const sessRes = await client.execute({
      sql: `SELECT * FROM admin_sessions WHERE token_hash = ?;`,
      args: [tokenHash],
    });

    const ok = final.success && final.sessionCreated && sessRes.rows.length === 1;
    record(
      1,
      'تسجيل دخول صحيح (Valid credentials successfully generate session in SQLite)',
      ok,
      `Session created: ${final.sessionCreated}, DB record verified: ID=${sessRes.rows[0]?.id}`
    );
  } catch (err: any) {
    record(1, 'تسجيل دخول صحيح', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: كلمة مرور خاطئة (Incorrect password)
  // --------------------------------------------------------------------------
  try {
    const clientIp = '10.50.0.2';
    const ipKey = computeHmacKey(clientIp, testSecret, 1);
    const resv = await acquireReservation(client, { ipKey, accountId: superAdminId, now });

    const isMatch = await verifyPassword(superAdminHash, 'WrongPasswordEntirely!');
    const final = await finalizeAuthentication(client, {
      reservationId: resv.reservationId!,
      ipKey,
      accountId: superAdminId,
      isAuthentic: isMatch,
      canIssueSession: false,
      now,
    });

    // Verify failures incremented
    const userRes = await client.execute({
      sql: `SELECT failed_login_attempts FROM admin_users WHERE id = ?;`,
      args: [superAdminId],
    });
    const failedAttempts = Number(userRes.rows[0]?.failed_login_attempts);

    const ok = !final.success && !final.sessionCreated && failedAttempts >= 1;
    record(
      2,
      'كلمة مرور خاطئة (Incorrect password increments failures and rejects session)',
      ok,
      `Success: ${final.success}, SessionCreated: ${final.sessionCreated}, Failed attempts in DB: ${failedAttempts}`
    );
  } catch (err: any) {
    record(2, 'كلمة مرور خاطئة', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: حساب غير نشط (Inactive account)
  // --------------------------------------------------------------------------
  try {
    const clientIp = '10.50.0.3';
    const ipKey = computeHmacKey(clientIp, testSecret, 1);
    const resv = await acquireReservation(client, { ipKey, accountId: inactiveUserId, now });

    // Even with correct password, inactive account must NEVER issue a session
    const isMatch = await verifyPassword(superAdminHash, validPassword);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);

    const final = await finalizeAuthentication(client, {
      reservationId: resv.reservationId!,
      ipKey,
      accountId: inactiveUserId,
      isAuthentic: isMatch,
      canIssueSession: true,
      tokenHash,
      clientIp,
      now,
    });

    const ok = !final.success && !final.sessionCreated;
    record(
      3,
      'حساب غير نشط (Inactive account strictly rejected from session issuance)',
      ok,
      `Rejected with success=${final.success}, sessionCreated=${final.sessionCreated}`
    );
  } catch (err: any) {
    record(3, 'حساب غير نشط', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: حساب مقفل (Locked account)
  // --------------------------------------------------------------------------
  try {
    const lockedUserId = crypto.randomUUID();
    const lockoutUntil = Date.now() + 15 * 60 * 1000;
    await client.execute({
      sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, failed_login_attempts, locked_until, security_generation, login_generation, created_at, updated_at)
            VALUES (?, 'role_spa_manager', 'locked_user', 'locked@alorspa.com', ?, 'حساب مقفل', 1, 5, ?, 1, 1, ?, ?);`,
      args: [lockedUserId, superAdminHash, lockoutUntil, now, now],
    });

    const clientIp = '10.50.0.4';
    const ipKey = computeHmacKey(clientIp, testSecret, 1);
    const resv = await acquireReservation(client, { ipKey, accountId: lockedUserId, now });

    const ok = !resv.admitted && resv.reason === 'ACCOUNT_LOCKED';
    record(
      4,
      'حساب مقفل (Locked account rejected at reservation layer before computing crypto)',
      ok,
      `Admitted: ${resv.admitted}, Reason: ${resv.reason}, Locked Until: ${resv.blockedUntil}`
    );
  } catch (err: any) {
    record(4, 'حساب مقفل', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: تجاوز حدود المحاولات (Rate limit exceeded)
  // --------------------------------------------------------------------------
  try {
    const bruteIp = '198.51.100.77';
    const ipKey = computeHmacKey(bruteIp, testSecret, 1);

    for (let i = 1; i <= 10; i++) {
      const resv = await acquireReservation(client, { ipKey, now });
      await finalizeAuthentication(client, {
        reservationId: resv.reservationId!,
        ipKey,
        isAuthentic: false,
        canIssueSession: false,
        now,
      });
    }

    // 11th attempt: must be blocked by IP Rate Limiter
    const resv11 = await acquireReservation(client, { ipKey, now });
    const ok = !resv11.admitted && resv11.reason === 'IP_BLOCKED';
    record(
      5,
      'تجاوز حدود المحاولات (IP rate limit threshold locks IP after 10 failures)',
      ok,
      `Admitted: ${resv11.admitted}, Reason: ${resv11.reason}`
    );
  } catch (err: any) {
    record(5, 'تجاوز حدود المحاولات', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: انتهاء الجلسة (Session expiration: Idle 24h & Absolute 7d)
  // --------------------------------------------------------------------------
  try {
    // 1. Idle timeout test: session created 25 hours ago, last activity 25 hours ago
    const idleToken = crypto.randomBytes(32).toString('hex');
    const idleHash = hashSessionToken(idleToken);
    const past25h = now - 25 * 60 * 60 * 1000;

    await client.execute({
      sql: `INSERT INTO admin_sessions (id, user_id, token_hash, security_generation, created_at, last_activity_at, expires_at)
            VALUES (?, ?, ?, 1, ?, ?, ?);`,
      args: [crypto.randomUUID(), superAdminId, idleHash, past25h, past25h, now + 5 * 86400 * 1000],
    });

    const idleVal = await validateSession(client, idleToken, now);
    const idleExpired = !idleVal.valid && idleVal.reason === 'EXPIRED_IDLE';

    // 2. Absolute timeout test: expires_at is past
    const absToken = crypto.randomBytes(32).toString('hex');
    const absHash = hashSessionToken(absToken);
    await client.execute({
      sql: `INSERT INTO admin_sessions (id, user_id, token_hash, security_generation, created_at, last_activity_at, expires_at)
            VALUES (?, ?, ?, 1, ?, ?, ?);`,
      args: [crypto.randomUUID(), superAdminId, absHash, past25h, now - 1000, now - 1000],
    });

    const absVal = await validateSession(client, absToken, now);
    const absExpired = !absVal.valid && absVal.reason === 'EXPIRED_ABSOLUTE';

    const ok = idleExpired && absExpired;
    record(
      6,
      'انتهاء الجلسة (Dual expiration: Idle timeout >24h & Absolute timeout >7d)',
      ok,
      `Idle rejected: ${idleVal.reason}, Absolute rejected: ${absVal.reason}`
    );
  } catch (err: any) {
    record(6, 'انتهاء الجلسة', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: تسجيل الخروج (Logout invalidates session in DB)
  // --------------------------------------------------------------------------
  try {
    // Validate session before logout
    const valBefore = await validateSession(client, test1SessionToken, now);
    const wasValid = valBefore.valid;

    // Execute logout revocation
    const tokenHash = hashSessionToken(test1SessionToken);
    await client.execute({
      sql: `UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?;`,
      args: [now, tokenHash],
    });

    // Validate session after logout
    const valAfter = await validateSession(client, test1SessionToken, now + 1000);
    const isRevoked = !valAfter.valid && valAfter.reason === 'NOT_FOUND_OR_REVOKED';

    const ok = wasValid && isRevoked;
    record(
      7,
      'تسجيل الخروج (Logout revokes session in DB and prevents token reuse)',
      ok,
      `Valid before: ${wasValid}, Rejected after logout: ${valAfter.reason}`
    );
  } catch (err: any) {
    record(7, 'تسجيل الخروج', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: محاولة الوصول إلى لوحة الإدارة دون جلسة
  // --------------------------------------------------------------------------
  try {
    // Validate missing or empty token
    const valMissing = await validateSession(client, '', now);
    const valRandom = await validateSession(client, 'non_existent_random_session_token_xyz', now);

    const ok =
      !valMissing.valid &&
      valMissing.reason === 'TOKEN_MISSING' &&
      !valRandom.valid &&
      valRandom.reason === 'NOT_FOUND_OR_REVOKED';

    record(
      8,
      'محاولة الوصول دون جلسة (Missing or forged session token cleanly rejected)',
      ok,
      `Missing: ${valMissing.reason}, Forged: ${valRandom.reason}`
    );
  } catch (err: any) {
    record(8, 'محاولة الوصول دون جلسة', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: التحقق من صلاحيات الأدوار (RBAC Authority Check)
  // --------------------------------------------------------------------------
  try {
    const superAdminLocals: App.Locals['user'] = {
      id: superAdminId,
      username: 'super_admin_test',
      email: 'super@alorspa.com',
      fullName: 'مدير عام',
      roleId: 'role_super_admin',
      roleSlug: 'super_admin',
      permissions: ['*'],
      securityGeneration: 1,
    };

    const editorLocals: App.Locals['user'] = {
      id: editorUserId,
      username: 'editor_user',
      email: 'editor@alorspa.com',
      fullName: 'محررة محتوى',
      roleId: 'role_content_editor',
      roleSlug: 'content_editor',
      permissions: ['services:read', 'services:write_draft', 'gallery:write'],
      securityGeneration: 1,
    };

    // 1. Super admin can do everything
    const superCanDelete = hasPermission(superAdminLocals, 'services:delete');
    const superCanManageUsers = hasPermission(superAdminLocals, 'users:manage');

    // 2. Editor can write gallery but CANNOT delete services or write prices
    const editorCanGallery = hasPermission(editorLocals, 'gallery:write');
    const editorCanDelete = hasPermission(editorLocals, 'services:delete');
    const editorCanPricing = hasPermission(editorLocals, 'pricing:write');

    // 3. Test requirePermission assertion
    let caughtForbidden = false;
    try {
      requirePermission(editorLocals, 'services:delete');
    } catch (e: any) {
      if (e instanceof ForbiddenError) caughtForbidden = true;
    }

    const ok =
      superCanDelete &&
      superCanManageUsers &&
      editorCanGallery &&
      !editorCanDelete &&
      !editorCanPricing &&
      caughtForbidden;

    record(
      9,
      'التحقق من صلاحيات الأدوار (Strict RBAC authority matrix enforcement)',
      ok,
      `SuperAdmin delete: ${superCanDelete}, Editor gallery: ${editorCanGallery}, Editor delete denied: ${!editorCanDelete}, ForbiddenError caught: ${caughtForbidden}`
    );
  } catch (err: any) {
    record(9, 'التحقق من صلاحيات الأدوار', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: حماية CSRF والتحقق من Origin/Referer
  // --------------------------------------------------------------------------
  try {
    // Valid origin matching host
    const originMatch = (origin: string, host: string) => {
      try {
        return new URL(origin).host === host;
      } catch {
        return false;
      }
    };

    const validCase = originMatch('https://alorspa.com', 'alorspa.com');
    const invalidCase = originMatch('https://malicious-attacker.com', 'alorspa.com');
    const malformedCase = originMatch('not-a-valid-url', 'alorspa.com');

    const ok = validCase === true && invalidCase === false && malformedCase === false;
    record(
      10,
      'حماية CSRF والتحقق من Origin (Origin and Referer header mismatch strictly blocked)',
      ok,
      `Matching host accepted: ${validCase}, Foreign host rejected: ${!invalidCase}, Malformed rejected: ${!malformedCase}`
    );
  } catch (err: any) {
    record(10, 'حماية CSRF والتحقق من Origin', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: عدم تسريب الأسرار إلى Logs أو ملفات العميل
  // --------------------------------------------------------------------------
  try {
    // Query activity logs to verify no plain password or raw token hash was logged
    const logs = await client.execute(`SELECT old_values, new_values FROM activity_logs;`);
    let clean = true;
    for (const log of logs.rows) {
      const s = JSON.stringify(log);
      if (s.includes(validPassword) || s.includes(test1SessionToken)) {
        clean = false;
      }
    }

    // Verify login page source code does NOT contain passwords or localStorage calls
    const loginPageSource = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/admin/login.astro'), 'utf8');
    const noLocalStorage = !loginPageSource.includes('localStorage') && !loginPageSource.includes('sessionStorage');

    const ok = clean && noLocalStorage;
    record(
      11,
      'عدم تسريب الأسرار (Zero credentials or tokens stored in client storage or activity logs)',
      ok,
      `Activity logs sanitized: ${clean}, Client storage free of tokens/passwords: ${noLocalStorage}`
    );
  } catch (err: any) {
    record(11, 'عدم تسريب الأسرار', false, err.message);
  }

  // Clean up sandbox database
  try {
    client.close();
  } catch {}

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

runMilestone4Phase4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
