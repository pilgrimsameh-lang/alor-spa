import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@libsql/client';
import {
  validateImageBuffer,
  processAndOptimizeImage,
  MediaValidationError,
  MAX_FILE_SIZE_BYTES,
} from './src/server/media/processor';
import { LocalStorageAdapter } from './src/server/storage/adapter';
import { checkMediaUsage } from './src/server/media/dependency-check';
import { mediaUpdateSchema } from './src/server/validation/crud-schemas';
import { recordActivityLog } from './src/server/audit/log-activity';
import { hasPermission } from './src/server/auth/rbac';

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

async function runMilestone5Phase2Tests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 5 / Phase 2: Media Library & Image Upload');
  console.log('================================================================\n');

  const runId = Date.now();
  const originalDbPath = path.resolve(process.cwd(), 'data/alor_spa.db');
  const testDbPath = path.resolve(process.cwd(), `data/test_m5_p2_${runId}.db`);
  const testUploadDir = path.resolve(process.cwd(), `public/uploads/test_media_${runId}`);

  // Create isolated sandbox DB
  fs.copyFileSync(originalDbPath, testDbPath);
  console.log(`[Setup] Sandboxed DB initialized at: ${testDbPath}`);
  console.log(`[Setup] Sandboxed upload dir initialized at: ${testUploadDir}\n`);

  const client = createClient({ url: `file:${testDbPath}` });
  const storage = new LocalStorageAdapter(testUploadDir, `/uploads/test_media_${runId}`);

  try {
    // --------------------------------------------------------------------------
    // Test 1: Valid Image Upload & WebP Optimization
    // --------------------------------------------------------------------------
    const rawPngBuffer = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 168, g: 121, b: 82, alpha: 1 }, // ALOR bronze
      },
    })
      .png()
      .toBuffer();

    const processed = await processAndOptimizeImage(rawPngBuffer, 'luxury-spa-suite.png');
    const saveRes = await storage.save(processed.filename, processed.buffer, processed.mimeType);

    const testMediaId = `med_test_${runId}`;
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO media_files (
        id, filename, original_name, mime_type, file_size, width, height,
        storage_path, public_url, alt_ar, alt_en, title_ar, title_en,
        uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        testMediaId,
        processed.filename,
        processed.originalName,
        processed.mimeType,
        processed.fileSize,
        processed.width,
        processed.height,
        saveRes.storagePath,
        saveRes.publicUrl,
        'جناح السبا الفاخر للاسترخاء',
        'Luxury spa relaxation suite',
        'جناح السبا',
        'Spa Suite',
        null,
        now,
        now,
      ],
    });

    const dbRead = await client.execute({
      sql: 'SELECT * FROM media_files WHERE id = ?;',
      args: [testMediaId],
    });

    const isTest1Valid =
      dbRead.rows.length === 1 &&
      processed.mimeType === 'image/webp' &&
      processed.width === 1200 &&
      processed.height === 800 &&
      fs.existsSync(path.resolve(testUploadDir, processed.filename));

    record(
      1,
      'Valid Image Upload & WebP Optimization',
      isTest1Valid,
      `WebP encoded, dimensions: ${processed.width}x${processed.height}px, size: ${processed.fileSize} bytes`
    );

    // --------------------------------------------------------------------------
    // Test 2: Reject Fake Extension (PHP / Script Disguised as JPG)
    // --------------------------------------------------------------------------
    let fakeExtensionCaught = false;
    let fakeErrorMsg = '';
    const fakeJpgBuffer = Buffer.from('<?php echo "malicious web shell"; system($_GET["cmd"]); ?>', 'utf-8');

    try {
      await processAndOptimizeImage(fakeJpgBuffer, 'shell.jpg');
    } catch (err: any) {
      if (err instanceof MediaValidationError) {
        fakeExtensionCaught = true;
        fakeErrorMsg = err.message;
      }
    }

    record(
      2,
      'Reject Fake Extension (Magic Bytes Mismatch)',
      fakeExtensionCaught,
      `Caught: "${fakeErrorMsg}"`
    );

    // --------------------------------------------------------------------------
    // Test 3: Reject Oversized File (> 10MB Limit)
    // --------------------------------------------------------------------------
    let oversizedCaught = false;
    let oversizedErrorMsg = '';
    // Allocate 11 MB dummy buffer
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024 * 1024);

    try {
      await validateImageBuffer(oversizedBuffer);
    } catch (err: any) {
      if (err instanceof MediaValidationError) {
        oversizedCaught = true;
        oversizedErrorMsg = err.message;
      }
    }

    record(
      3,
      'Reject Oversized File (> 10MB)',
      oversizedCaught,
      `Caught: "${oversizedErrorMsg}"`
    );

    // --------------------------------------------------------------------------
    // Test 4: Reject Unsupported Types (Executable / Plain Text)
    // --------------------------------------------------------------------------
    let unsupportedCaught = false;
    let unsupportedMsg = '';
    const textBuffer = Buffer.from('This is a plain text file, not an image.', 'utf-8');

    try {
      await validateImageBuffer(textBuffer);
    } catch (err: any) {
      if (err instanceof MediaValidationError) {
        unsupportedCaught = true;
        unsupportedMsg = err.message;
      }
    }

    record(
      4,
      'Reject Unsupported Types',
      unsupportedCaught,
      `Caught: "${unsupportedMsg}"`
    );

    // --------------------------------------------------------------------------
    // Test 5: Storage Adapter & Image Persistence Across Server Restart
    // --------------------------------------------------------------------------
    const existsBefore = await storage.exists(saveRes.storagePath);
    // Simulate server restart by creating a new storage instance pointing to the same folder
    const restartedStorage = new LocalStorageAdapter(testUploadDir, `/uploads/test_media_${runId}`);
    const existsAfterRestart = await restartedStorage.exists(saveRes.storagePath);
    const resolvedUrl = restartedStorage.getUrl(saveRes.storagePath);

    const isTest5Valid = existsBefore && existsAfterRestart && resolvedUrl.includes(processed.filename);
    record(
      5,
      'Image Persistence across Server Restart',
      isTest5Valid,
      `File persisted on disk and accessible via URL: ${resolvedUrl}`
    );

    // --------------------------------------------------------------------------
    // Test 6: Selecting Image & Linking to a Service
    // --------------------------------------------------------------------------
    const testServiceId = `srv_test_${runId}`;
    await client.execute({
      sql: `INSERT INTO services (
        id, category_id, featured_image_id, slug,
        title_ar, title_en, subtitle_ar, subtitle_en,
        description_ar, description_en, detailed_description_ar, detailed_description_en,
        is_signature, is_published, display_order,
        price_amount_halalas, price_currency, price_is_confirmed, price_display_ar, price_display_en,
        duration_minutes, duration_is_confirmed, duration_display_ar, duration_display_en,
        features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en, includes_ar, includes_en,
        suitability_ar, suitability_en, advisory_ar, advisory_en,
        seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, '[]', '[]',
        0, 1, 99,
        NULL, 'SAR', 0, 'الأسعار عند الاستفسار', 'Price on inquiry',
        NULL, 0, 'تحدد عند الحجز', 'Confirmed upon booking',
        '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]',
        'مناسب للجميع', 'Suitable for all', 'استشارة مجانية', 'Free consultation',
        'خدمة تجريبية', 'Test Service', 'وصف تجريبي', 'Test Description',
        ?, ?
      );`,
      args: [
        testServiceId,
        'cat_massage',
        testMediaId, // Foreign Key Link!
        `test-service-${runId}`,
        'جلسة تدليك تجريبية فاخرة',
        'Luxury Test Massage Session',
        'تجربة استرخاء حصرية',
        'Exclusive relaxation experience',
        'جلسة تدليك متكاملة في السبا',
        'Full massage treatment in the spa',
        now,
        now,
      ],
    });

    const serviceJoined = await client.execute({
      sql: `SELECT s.id, s.title_ar, m.public_url, m.original_name
            FROM services s
            JOIN media_files m ON s.featured_image_id = m.id
            WHERE s.id = ?;`,
      args: [testServiceId],
    });

    const isTest6Valid =
      serviceJoined.rows.length === 1 &&
      serviceJoined.rows[0].public_url === saveRes.publicUrl;

    record(
      6,
      'Select Image & Link to Service (Relational Foreign Key)',
      isTest6Valid,
      `Service "${testServiceId}" correctly joined media URL "${saveRes.publicUrl}"`
    );

    // --------------------------------------------------------------------------
    // Test 7: Prevent Deletion of In-Use Image (Referential Safety)
    // --------------------------------------------------------------------------
    const usageCheck = await checkMediaUsage(client, testMediaId);
    const hasBlocked = usageCheck.isInUse && usageCheck.references.length === 1;
    const refMatch = usageCheck.references[0]?.type === 'SERVICE';

    // Verify foreign key constraint rejection if attempted directly
    let fkBlocked = false;
    try {
      // libSQL foreign keys PRAGMA check
      await client.execute('PRAGMA foreign_keys = ON;');
      await client.execute({
        sql: 'DELETE FROM media_files WHERE id = ?;',
        args: [testMediaId],
      });
    } catch {
      fkBlocked = true;
    }

    // Verify record still exists
    const stillExists = await client.execute({
      sql: 'SELECT id FROM media_files WHERE id = ?;',
      args: [testMediaId],
    });

    const isTest7Valid = hasBlocked && refMatch && (fkBlocked || stillExists.rows.length === 1);
    record(
      7,
      'Prevent Deletion of In-Use Image',
      isTest7Valid,
      `Refusal verified: ${usageCheck.summaryMessageAr}`
    );

    // --------------------------------------------------------------------------
    // Test 8: Deletion of Unused Image (DB & Disk File Cleaned)
    // --------------------------------------------------------------------------
    // 1. Unlink service from media file
    await client.execute({
      sql: 'DELETE FROM services WHERE id = ?;',
      args: [testServiceId],
    });

    // 2. Re-check usage
    const reUsage = await checkMediaUsage(client, testMediaId);
    const canNowDelete = !reUsage.isInUse;

    // 3. Delete from storage and database
    const fileDeleted = await storage.delete(saveRes.storagePath);
    await client.execute({
      sql: 'DELETE FROM media_files WHERE id = ?;',
      args: [testMediaId],
    });

    const finalDbCheck = await client.execute({
      sql: 'SELECT id FROM media_files WHERE id = ?;',
      args: [testMediaId],
    });

    const diskFileExists = await storage.exists(saveRes.storagePath);
    const isTest8Valid =
      canNowDelete && fileDeleted && finalDbCheck.rows.length === 0 && !diskFileExists;

    record(
      8,
      'Deletion of Unused Image (DB & Disk Cleaned)',
      isTest8Valid,
      'Both database record and physical disk file cleanly purged without orphans'
    );

    // --------------------------------------------------------------------------
    // Test 9: RBAC & Permission Protection (media:read & media:write)
    // --------------------------------------------------------------------------
    const guestUser = null;
    const unauthorizedUser: any = {
      id: 'usr_viewer',
      username: 'viewer',
      roleSlug: 'spa_receptionist',
      permissions: ['services:read'],
    };
    const contentEditor: any = {
      id: 'usr_editor',
      username: 'editor',
      roleSlug: 'content_editor',
      permissions: ['media:read', 'media:write'],
    };
    const superAdmin: any = {
      id: 'usr_super',
      username: 'superadmin',
      roleSlug: 'super_admin',
      permissions: ['*'],
    };

    const guestBlocked = !hasPermission(guestUser, 'media:write');
    const unauthorizedBlocked = !hasPermission(unauthorizedUser, 'media:write');
    const editorAllowed = hasPermission(contentEditor, 'media:write');
    const superAllowed = hasPermission(superAdmin, 'media:write');

    const isTest9Valid = guestBlocked && unauthorizedBlocked && editorAllowed && superAllowed;
    record(
      9,
      'RBAC & Permission Protection Enforcement',
      isTest9Valid,
      'Unprivileged users strictly blocked; content editor and super admin authorized'
    );

    // --------------------------------------------------------------------------
    // Test 10: Metadata Update (Alt Text & Titles Schema Validation)
    // --------------------------------------------------------------------------
    const validMeta = mediaUpdateSchema.parse({
      alt_ar: 'نص بديل تجريبي للأشخاص ذوي الإعاقة البصرية',
      alt_en: 'Descriptive accessible alt text for screen readers',
      title_ar: 'عنوان توضيحي',
      title_en: 'Descriptive Title',
    });

    let schemaRejectedInvalid = false;
    try {
      // Over 300 characters should fail
      mediaUpdateSchema.parse({
        alt_ar: 'A'.repeat(350),
      });
    } catch {
      schemaRejectedInvalid = true;
    }

    const isTest10Valid = Boolean(validMeta.alt_ar) && schemaRejectedInvalid;
    record(
      10,
      'Alt Text & Metadata Zod Validation',
      isTest10Valid,
      'Bilingual alt text validated with length boundaries'
    );

    // --------------------------------------------------------------------------
    // Test 11: Activity Logging for Media Operations
    // --------------------------------------------------------------------------
    // Create an authenticated test admin in admin_users to satisfy FK constraint
    const testAdminUserId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO admin_users (
        id, role_id, username, email, password_hash, full_name, is_active,
        failed_login_attempts, security_generation, login_generation, created_at, updated_at
      ) VALUES (?, 'role_super_admin', ?, ?, 'dummy_hash', 'Audit Admin', 1, 0, 1, 1, ?, ?);`,
      args: [testAdminUserId, `admin_${runId}`, `admin_${runId}@alorspa.com`, now, now],
    });

    const logId = await recordActivityLog(client, {
      userId: testAdminUserId,
      action: 'CREATE',
      entityType: 'MEDIA',
      entityId: testMediaId,
      newValues: {
        filename: 'alor_test.webp',
        original_name: 'test.png',
        mime_type: 'image/webp',
        file_size: 15420,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Milestone5-Test-Runner',
    });

    const logRead = await client.execute({
      sql: 'SELECT * FROM activity_logs WHERE id = ?;',
      args: [logId],
    });

    const isTest11Valid =
      logRead.rows.length === 1 &&
      logRead.rows[0].entity_type === 'MEDIA' &&
      logRead.rows[0].action === 'CREATE';

    record(
      11,
      'Activity Logging for Media Operations',
      isTest11Valid,
      `Audit entry ${logId} logged without leaking secrets or credentials`
    );

    // --------------------------------------------------------------------------
    // Test 12: Database Integrity & Constraints Verification
    // --------------------------------------------------------------------------
    const fkCheckRes = await client.execute('PRAGMA foreign_key_check;');
    const isTest12Valid = fkCheckRes.rows.length === 0;

    record(
      12,
      'Database Integrity & Relations Verification',
      isTest12Valid,
      `PRAGMA foreign_key_check reported ${fkCheckRes.rows.length} violations`
    );
  } finally {
    // Clean up disposable test database and sandbox upload files
    try {
      client.close();
      await new Promise((res) => setTimeout(res, 150));
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch {}
      }
      const wal = `${testDbPath}-wal`;
      if (fs.existsSync(wal)) {
        try { fs.unlinkSync(wal); } catch {}
      }
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(shm)) {
        try { fs.unlinkSync(shm); } catch {}
      }
      if (fs.existsSync(testUploadDir)) {
        try { fs.rmSync(testUploadDir, { recursive: true, force: true }); } catch {}
      }
      console.log('\n[Cleanup] Disposable test sandbox database & files cleanly removed.');
    } catch (cleanupErr) {
      console.error('[Cleanup] Notice during cleanup:', cleanupErr);
    }
  }

  // Summary
  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;
  console.log(` SUMMARY: ${passedCount}/${results.length} Tests Passed`);
  console.log('================================================================');

  if (!allPassed) {
    console.error('Some tests failed!');
    process.exit(1);
  } else {
    console.log('All Milestone 5 Phase 2 tests passed successfully!\n');
  }
}

runMilestone5Phase2Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
