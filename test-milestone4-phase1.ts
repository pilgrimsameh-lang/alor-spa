import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { runMigrations } from './src/server/db/migrate';
import { getDb } from './src/server/db/index';
import { adminUsers, adminRoles, siteSettings } from './src/server/db/schema';
import { hashPassword, verifyPassword } from './src/server/auth/password';
import {
  computeHmacKey,
  acquireReservation,
  cancelReservation,
  finalizeAuthentication,
  mergeKeyRotationRecord,
  RATE_LIMIT_CONFIG,
} from './src/server/auth/rate-limit';
import {
  Argon2ResourceLimiter,
  getSafeArgon2Concurrency,
  ResourceLimiterError,
} from './src/server/auth/resource-limiter';
import {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  hashSessionToken,
} from './src/server/auth/session';
import { extractClientIp, InvalidIpHeaderError } from './src/server/auth/ip';
import { executeWithSqliteBudget } from './src/server/db/budget';
import { emergencyRateLimitPurge } from './scripts/emergency-rate-limit-purge';

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

async function runMilestone4Phase1Tests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 4 / Phase 1: Database & Auth Foundation');
  console.log('================================================================\n');

  // Setup isolated test database from pre-migration backup
  const runId = Date.now();
  const backupDbPath = path.resolve(process.cwd(), 'data/backups/alor_spa_20261106_pre_m4_p1.db');
  const testDbPath = path.resolve(process.cwd(), `data/test_phase1_${runId}.db`);

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
  if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  fs.copyFileSync(backupDbPath, testDbPath);
  console.log(`[Setup] Sandboxed DB initialized at: ${testDbPath}\n`);

  const client = createClient({ url: `file:${testDbPath}` });

  // --------------------------------------------------------------------------
  // TEST 1: Migration 0003 applies cleanly and verifies integrity
  // --------------------------------------------------------------------------
  try {
    await runMigrations(testDbPath);
    const integrity = await client.execute('PRAGMA integrity_check;');
    const fks = await client.execute('PRAGMA foreign_key_check;');
    const ok = integrity.rows[0].integrity_check === 'ok' && fks.rows.length === 0;
    record(
      1,
      'Migration 0003 executes cleanly with zero integrity/foreign key errors',
      ok,
      `Integrity: ${integrity.rows[0].integrity_check}, FK violations: ${fks.rows.length}`
    );
  } catch (err: any) {
    record(1, 'Migration 0003 executes cleanly', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Schema verification of new tables and columns
  // --------------------------------------------------------------------------
  try {
    const userCols = (await client.execute('PRAGMA table_info(admin_users);')).rows.map((r: any) => r.name);
    const sessCols = (await client.execute('PRAGMA table_info(admin_sessions);')).rows.map((r: any) => r.name);
    const rlCols = (await client.execute('PRAGMA table_info(rate_limit_records);')).rows.map((r: any) => r.name);
    const resCols = (await client.execute('PRAGMA table_info(rate_limit_reservations);')).rows.map((r: any) => r.name);

    const hasUserGens = userCols.includes('security_generation') && userCols.includes('login_generation');
    const hasSessGen = sessCols.includes('security_generation');
    const hasRlCols = rlCols.includes('key') && rlCols.includes('generation') && rlCols.includes('failures');
    const hasResCols = resCols.includes('lease_expires_at') && resCols.includes('hard_timeout_at');

    const ok = hasUserGens && hasSessGen && hasRlCols && hasResCols;
    record(
      2,
      'Schema verification for rate_limit tables and generation columns',
      ok,
      `Users gens: ${hasUserGens}, Session sec_gen: ${hasSessGen}, RL cols: ${hasRlCols}, Res cols: ${hasResCols}`
    );
  } catch (err: any) {
    record(2, 'Schema verification for rate_limit tables', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: CHECK constraints on rate_limit_records & reservations
  // --------------------------------------------------------------------------
  try {
    let negativeFailuresRejected = false;
    try {
      await client.execute({
        sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('bad_fail', 1, -1, 1, 1000);`,
        args: [],
      });
    } catch (e: any) {
      if (e.message.includes('CHECK constraint failed')) negativeFailuresRejected = true;
    }

    let zeroGenerationRejected = false;
    try {
      await client.execute({
        sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('bad_gen', 1, 0, 0, 1000);`,
        args: [],
      });
    } catch (e: any) {
      if (e.message.includes('CHECK constraint failed')) zeroGenerationRejected = true;
    }

    let badStatusRejected = false;
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, generation, updated_at) VALUES ('valid_k', 1, 0, 1, 1000);`,
      args: [],
    });
    try {
      await client.execute({
        sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at)
              VALUES ('res_bad_status', 'valid_k', 1, 'INVALID', 1000, 2000, 3000);`,
        args: [],
      });
    } catch (e: any) {
      if (e.message.includes('CHECK constraint failed')) badStatusRejected = true;
    }

    const ok = negativeFailuresRejected && zeroGenerationRejected && badStatusRejected;
    record(
      3,
      'CHECK constraints enforce positive failures, generation >= 1, and status = ACTIVE',
      ok,
      `Neg failures rejected: ${negativeFailuresRejected}, Gen=0 rejected: ${zeroGenerationRejected}, Bad status rejected: ${badStatusRejected}`
    );
  } catch (err: any) {
    record(3, 'CHECK constraints enforcement', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Foreign Key and ON DELETE RESTRICT behavior
  // --------------------------------------------------------------------------
  try {
    let fkMissingKeyRejected = false;
    try {
      await client.execute({
        sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at)
              VALUES ('res_missing_k', 'non_existent_key_123', 1, 'ACTIVE', 1000, 2000, 3000);`,
        args: [],
      });
    } catch (e: any) {
      if (e.message.includes('FOREIGN KEY constraint failed')) fkMissingKeyRejected = true;
    }

    // Insert active reservation on 'valid_k'
    await client.execute({
      sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at)
            VALUES ('res_restrict_test', 'valid_k', 1, 'ACTIVE', 1000, 2000, 3000);`,
      args: [],
    });

    let deleteRestricted = false;
    try {
      await client.execute(`DELETE FROM rate_limit_records WHERE key = 'valid_k';`);
    } catch (e: any) {
      if (e.message.includes('FOREIGN KEY constraint failed')) deleteRestricted = true;
    }

    // Clean up reservation
    await client.execute(`DELETE FROM rate_limit_reservations WHERE id = 'res_restrict_test';`);
    await client.execute(`DELETE FROM rate_limit_records WHERE key = 'valid_k';`);

    const ok = fkMissingKeyRejected && deleteRestricted;
    record(
      4,
      'Foreign Key and ON DELETE RESTRICT safely prevent orphan reservations',
      ok,
      `Non-existent parent rejected: ${fkMissingKeyRejected}, Deletion restricted: ${deleteRestricted}`
    );
  } catch (err: any) {
    record(4, 'Foreign Key and ON DELETE RESTRICT', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Reservation Lifecycle & Concurrency Leases (Max 2 active per IP)
  // --------------------------------------------------------------------------
  try {
    const testSecret = '01234567890123456789012345678901234567890123456789';
    const clientIp = '10.0.0.15';
    const ipKey = computeHmacKey(clientIp, testSecret, 1);
    const now = Date.now();

    // Lease 1: Should succeed
    const lease1 = await acquireReservation(client, { ipKey, now });
    // Lease 2: Should succeed
    const lease2 = await acquireReservation(client, { ipKey, now });
    // Lease 3: Exceeds max 2 concurrent active leases, must be rejected
    const lease3 = await acquireReservation(client, { ipKey, now });

    const leaseLimitsOk = lease1.admitted && lease2.admitted && !lease3.admitted && lease3.reason === 'IP_CONCURRENCY_EXCEEDED';

    // Cancelling lease 1 frees a slot
    if (lease1.reservationId) {
      await cancelReservation(client, lease1.reservationId);
    }

    // Now acquiring a new lease succeeds
    const lease4 = await acquireReservation(client, { ipKey, now });

    if (lease2.reservationId) await cancelReservation(client, lease2.reservationId);
    if (lease4.reservationId) await cancelReservation(client, lease4.reservationId);

    const ok = leaseLimitsOk && lease4.admitted;
    record(
      5,
      'Reservation lifecycle enforces max 2 concurrent leases per IP and releases on cancel',
      ok,
      `Lease 1 & 2 admitted, Lease 3 rejected (${lease3.reason}), Lease 4 admitted after cancel`
    );
  } catch (err: any) {
    record(5, 'Reservation lifecycle and concurrency leases', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Persistent IP Rate Limiting (10 failures triggers 15m block)
  // --------------------------------------------------------------------------
  try {
    const testSecret = '01234567890123456789012345678901234567890123456789';
    const bruteIp = '198.51.100.99';
    const ipKey = computeHmacKey(bruteIp, testSecret, 1);
    const now = Date.now();

    // Perform 9 failures
    for (let i = 1; i <= 9; i++) {
      const resv = await acquireReservation(client, { ipKey, now });
      if (!resv.admitted || !resv.reservationId) throw new Error(`Lease failed on attempt ${i}: reason=${resv.reason}`);
      await finalizeAuthentication(client, {
        reservationId: resv.reservationId,
        ipKey,
        isAuthentic: false,
        canIssueSession: false,
        now,
      });
    }

    // 10th failure must trigger IP lockout
    const resv10 = await acquireReservation(client, { ipKey, now });
    const final10 = await finalizeAuthentication(client, {
      reservationId: resv10.reservationId!,
      ipKey,
      isAuthentic: false,
      canIssueSession: false,
      now,
    });

    const isLockedOut = final10.errorCode === 'RATE_LIMITED';

    // Subsequent acquire must be rejected with IP_BLOCKED
    const tryBlocked = await acquireReservation(client, { ipKey, now });
    const properlyBlocked = !tryBlocked.admitted && tryBlocked.reason === 'IP_BLOCKED';

    // Emergency purge unblocks the IP
    const purgeResult = await emergencyRateLimitPurge(testDbPath, bruteIp, testSecret);

    // After purge, acquiring succeeds
    const tryAfterPurge = await acquireReservation(client, { ipKey, now });

    if (tryAfterPurge.reservationId) {
      await cancelReservation(client, tryAfterPurge.reservationId);
    }

    const ok = isLockedOut && properlyBlocked && purgeResult.success && tryAfterPurge.admitted;
    record(
      6,
      'Persistent IP rate limiting locks at 10 failures and unblocks via emergency purge',
      ok,
      `10th failure: ${final10.errorCode}, Subsequent acquire: ${tryBlocked.reason}, Purge: ${purgeResult.success}, Unblocked: ${tryAfterPurge.admitted}`
    );
  } catch (err: any) {
    record(6, 'Persistent IP rate limiting', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Single-Pass Atomic Merge for HMAC Key Rotation
  // --------------------------------------------------------------------------
  try {
    const now = Date.now();
    const keyV1 = 'hmac_v1_test_key_sample';
    const keyV2 = 'hmac_v2_test_key_sample';

    // Setup V1 with 3 failures and generation = 2
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, first_failure_at, blocked_until, generation, updated_at)
            VALUES (?, 1, 3, ?, NULL, 2, ?);`,
      args: [keyV1, now - 60000, now - 60000],
    });

    // Setup V2 with 2 failures and generation = 3
    await client.execute({
      sql: `INSERT INTO rate_limit_records (key, key_version, failures, first_failure_at, blocked_until, generation, updated_at)
            VALUES (?, 2, 2, ?, NULL, 3, ?);`,
      args: [keyV2, now - 30000, now - 30000],
    });

    // Attach active reservation to V1
    await client.execute({
      sql: `INSERT INTO rate_limit_reservations (id, key, snapshot_ip_generation, status, created_at, lease_expires_at, hard_timeout_at)
            VALUES ('res_v1_test', ?, 5, 'ACTIVE', ?, ?, ?);`,
      args: [keyV1, now, now + 15000, now + 30000],
    });

    // Execute atomic merge
    const mergeOk = await mergeKeyRotationRecord(client, keyV1, keyV2, 2, now);

    // Verify V1 is deleted
    const v1Check = await client.execute({ sql: `SELECT * FROM rate_limit_records WHERE key = ?;`, args: [keyV1] });
    const v1Deleted = v1Check.rows.length === 0;

    // Verify V2 generation = 2 + 3 = 5, failures = 3 + 2 = 5
    const v2Check = await client.execute({ sql: `SELECT * FROM rate_limit_records WHERE key = ?;`, args: [keyV2] });
    const v2Row = v2Check.rows[0];
    const v2Gen = Number(v2Row.generation);
    const v2Failures = Number(v2Row.failures);

    // Verify reservation was migrated to V2 with adjusted snapshot: snapshot = 5 + v2_gen_old(3) = 8
    const resCheck = await client.execute({ sql: `SELECT * FROM rate_limit_reservations WHERE id = 'res_v1_test';`, args: [] });
    const resRow = resCheck.rows[0];
    const resKey = resRow.key;
    const resSnap = Number(resRow.snapshot_ip_generation);

    await client.execute(`DELETE FROM rate_limit_reservations WHERE id = 'res_v1_test';`);
    await client.execute({ sql: `DELETE FROM rate_limit_records WHERE key = ?;`, args: [keyV2] });

    const ok = mergeOk && v1Deleted && v2Gen === 5 && v2Failures === 5 && resKey === keyV2 && resSnap === 8;
    record(
      7,
      'Single-Pass Atomic Merge for HMAC Key Rotation without double-transformation',
      ok,
      `V1 deleted: ${v1Deleted}, Merged Gen: ${v2Gen} (exp 5), Failures: ${v2Failures} (exp 5), Res Key: ${resKey}, Res Snapshot: ${resSnap} (exp 8)`
    );
  } catch (err: any) {
    record(7, 'Single-Pass Atomic Merge for HMAC Key Rotation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Argon2 Resource Limiter Semaphore & Zero Capacity Guard
  // --------------------------------------------------------------------------
  try {
    const limiter = new Argon2ResourceLimiter(2);
    limiter._setCapacityForTesting(1);

    // Acquire slot 1
    const release1 = await limiter.acquire(1000);
    const active1 = limiter.getActiveCount();

    // Trying to acquire slot 2 with 50ms timeout should queue and time out
    let timedOut = false;
    try {
      await limiter.acquire(50);
    } catch (e: any) {
      if (e instanceof ResourceLimiterError && e.statusCode === 503) {
        timedOut = true;
      }
    }

    // Release slot 1
    release1();
    const activeAfterRelease = limiter.getActiveCount();

    // Test zero capacity guard (OOM defense)
    limiter._setCapacityForTesting(0);
    let zeroCapacityRejected = false;
    try {
      await limiter.acquire(100);
    } catch (e: any) {
      if (e instanceof ResourceLimiterError && e.statusCode === 503) {
        zeroCapacityRejected = true;
      }
    }

    limiter._resetForTesting();

    const ok = active1 === 1 && timedOut && activeAfterRelease === 0 && zeroCapacityRejected;
    record(
      8,
      'Argon2 Resource Limiter manages concurrency and rejects safely on zero capacity (503)',
      ok,
      `Active: ${active1}, Queued timeout: ${timedOut}, Released: ${activeAfterRelease === 0}, Zero-cap rejected: ${zeroCapacityRejected}`
    );
  } catch (err: any) {
    record(8, 'Argon2 Resource Limiter Semaphore', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Generation Management & Instant Session Revocation
  // --------------------------------------------------------------------------
  try {
    const now = Date.now();
    const testUserId = crypto.randomUUID();
    const passHash = await hashPassword('SecretTestPassword123!');

    // Create test user with security_generation = 1
    await client.execute({
      sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, security_generation, login_generation, created_at, updated_at)
            VALUES (?, 'role_super_admin', 'session_tester', 'sess@test.com', ?, 'Session Tester', 1, 1, ?, ?);`,
      args: [testUserId, passHash, now, now],
    });

    // Create two active sessions for this user (e.g. laptop & mobile)
    const sess1 = await createSession(client, { userId: testUserId, clientIp: '1.1.1.1', userAgent: 'Laptop', now });
    const sess2 = await createSession(client, { userId: testUserId, clientIp: '2.2.2.2', userAgent: 'Mobile', now });

    // Validate both sessions (both must be valid initially)
    const val1 = await validateSession(client, sess1.rawToken, now);
    const val2 = await validateSession(client, sess2.rawToken, now);
    const bothValid = val1.valid && val2.valid;

    // Security event occurs: revoke all sessions (e.g. password reset)
    await revokeAllUserSessions(client, testUserId, now + 1000);

    // Validate sessions again: both must be rejected with SECURITY_REVOKED
    const val1After = await validateSession(client, sess1.rawToken, now + 2000);
    const val2After = await validateSession(client, sess2.rawToken, now + 2000);

    const revokedProperly =
      !val1After.valid &&
      val1After.reason === 'SECURITY_REVOKED' &&
      !val2After.valid &&
      val2After.reason === 'SECURITY_REVOKED';

    // Verify user security_generation was incremented to 2
    const userAfter = await client.execute({ sql: `SELECT security_generation FROM admin_users WHERE id = ?;`, args: [testUserId] });
    const newGen = Number(userAfter.rows[0].security_generation);

    // Clean up
    await client.execute({ sql: `DELETE FROM admin_sessions WHERE user_id = ?;`, args: [testUserId] });
    await client.execute({ sql: `DELETE FROM admin_users WHERE id = ?;`, args: [testUserId] });

    const ok = bothValid && revokedProperly && newGen === 2;
    record(
      9,
      'Generation Management: advancing security_generation instantly revokes all active sessions',
      ok,
      `Concurrent sessions valid: ${bothValid}, Revoked after gen bump: ${revokedProperly}, User sec_gen: ${newGen}`
    );
  } catch (err: any) {
    record(9, 'Generation Management & Session Revocation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Trusted Proxy Traversal & Header Poisoning Defense
  // --------------------------------------------------------------------------
  try {
    const trustedProxies = ['127.0.0.1/32', '10.0.0.0/8'];

    // 1. Untrusted peer: ignores X-Forwarded-For completely
    const ipUntrustedPeer = extractClientIp({
      peerIp: '203.0.113.50',
      forwardedForHeader: '192.168.1.1, 10.0.0.1',
      trustedProxies,
    });

    // 2. Trusted proxy peer: extracts authentic client IP (first untrusted from right)
    const ipTrustedPeer = extractClientIp({
      peerIp: '10.0.0.2',
      forwardedForHeader: '203.0.113.195, 10.0.0.99',
      trustedProxies,
    });

    // 3. Malformed IP in chain: throws InvalidIpHeaderError (triggers 400 Bad Request)
    let malformedCaught = false;
    try {
      extractClientIp({
        peerIp: '10.0.0.2',
        forwardedForHeader: 'invalid_ip_text, 10.0.0.99',
        trustedProxies,
      });
    } catch (e: any) {
      if (e instanceof InvalidIpHeaderError) malformedCaught = true;
    }

    // 4. All proxies in chain: throws InvalidIpHeaderError to prevent proxy lockout
    let allProxiesCaught = false;
    try {
      extractClientIp({
        peerIp: '10.0.0.2',
        forwardedForHeader: '10.0.0.5, 10.0.0.6',
        trustedProxies,
      });
    } catch (e: any) {
      if (e instanceof InvalidIpHeaderError) allProxiesCaught = true;
    }

    const ok =
      ipUntrustedPeer === '203.0.113.50' &&
      ipTrustedPeer === '203.0.113.195' &&
      malformedCaught &&
      allProxiesCaught;

    record(
      10,
      'Reverse proxy extraction prevents header poisoning, spoofing, and proxy blacklisting',
      ok,
      `Untrusted peer ignored: ${ipUntrustedPeer === '203.0.113.50'}, Trusted traversal: ${ipTrustedPeer}, Malformed rejected: ${malformedCaught}, All-proxies rejected: ${allProxiesCaught}`
    );
  } catch (err: any) {
    record(10, 'Trusted Proxy Traversal', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: SQLite Concurrency Budget Ceiling (<= 1750ms)
  // --------------------------------------------------------------------------
  try {
    const start = performance.now();
    const result = await executeWithSqliteBudget(async () => {
      return await client.execute('SELECT 1 as test;');
    });
    const duration = performance.now() - start;

    const ok = result.rows[0].test === 1 && duration < 1750;
    record(
      11,
      'SQLite Concurrency Budget wrapper executes safely within timeout ceiling',
      ok,
      `Executed in ${duration.toFixed(2)}ms (< 1750ms ceiling)`
    );
  } catch (err: any) {
    record(11, 'SQLite Concurrency Budget', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Preserved Business Data and Protected WhatsApp Number
  // --------------------------------------------------------------------------
  try {
    const wa = await client.execute("SELECT value_raw, is_immutable FROM site_settings WHERE key = 'contact.whatsapp';");
    const categories = await client.execute('SELECT COUNT(*) as c FROM service_categories;');
    const services = await client.execute('SELECT COUNT(*) as c FROM services;');

    const waOk = wa.rows[0]?.value_raw === '966553543192' && wa.rows[0]?.is_immutable === 1;
    const dataOk = Number(categories.rows[0]?.c) === 4 && Number(services.rows[0]?.c) === 6;

    const ok = waOk && dataOk;
    record(
      12,
      'Official WhatsApp number 966553543192 and core business services 100% preserved',
      ok,
      `WhatsApp: ${wa.rows[0]?.value_raw} (immutable=1), Categories: ${categories.rows[0]?.c}, Services: ${services.rows[0]?.c}`
    );
  } catch (err: any) {
    record(12, 'Preserved Business Data and Protected WhatsApp Number', false, err.message);
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

runMilestone4Phase1Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
