import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';
import { getDb } from './src/server/db/index';
import { hashPassword } from './src/server/auth/password';
import { createSession, validateSession, SESSION_CONFIG } from './src/server/auth/session';
import { hasPermission, requirePermission, ForbiddenError } from './src/server/auth/rbac';
import {
  ADMIN_NAV_ITEMS,
  getAccessibleNavItems,
  getSectionMetadata,
  canAccessSection,
} from './src/server/auth/admin-nav';

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

async function runMilestone4Phase5Tests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 4 / Phase 5: Admin Dashboard Verification');
  console.log('================================================================\n');

  const runId = Date.now();
  const originalDbPath = path.resolve(process.cwd(), 'data/alor_spa.db');
  const testDbPath = path.resolve(process.cwd(), `data/test_phase5_${runId}.db`);

  // Create disposable sandbox copy
  fs.copyFileSync(originalDbPath, testDbPath);
  console.log(`[Setup] Initialized sandbox database at: ${testDbPath}\n`);

  const client = createClient({ url: `file:${testDbPath}` });

  try {
    // --------------------------------------------------------------------------
    // Test 1: Real Database Statistics (No Fake Numbers)
    // --------------------------------------------------------------------------
    const [
      servicesRes,
      categoriesRes,
      offersRes,
      galleryRes,
      reviewsRes,
      blogRes,
      usersRes,
      mediaRes,
      settingsRes,
    ] = await Promise.all([
      client.execute('SELECT COUNT(*) as count FROM services;'),
      client.execute('SELECT COUNT(*) as count FROM service_categories;'),
      client.execute('SELECT COUNT(*) as count FROM offers WHERE is_active = 1;'),
      client.execute('SELECT COUNT(*) as count FROM gallery_items;'),
      client.execute('SELECT COUNT(*) as count FROM reviews;'),
      client.execute('SELECT COUNT(*) as count FROM blog_posts;'),
      client.execute('SELECT COUNT(*) as count FROM admin_users WHERE is_active = 1;'),
      client.execute('SELECT COUNT(*) as count FROM media_files;'),
      client.execute('SELECT COUNT(*) as count FROM site_settings;'),
    ]);

    const stats = {
      services: Number(servicesRes.rows[0]?.count ?? 0),
      categories: Number(categoriesRes.rows[0]?.count ?? 0),
      offers: Number(offersRes.rows[0]?.count ?? 0),
      gallery: Number(galleryRes.rows[0]?.count ?? 0),
      reviews: Number(reviewsRes.rows[0]?.count ?? 0),
      blog: Number(blogRes.rows[0]?.count ?? 0),
      users: Number(usersRes.rows[0]?.count ?? 0),
      media: Number(mediaRes.rows[0]?.count ?? 0),
      settings: Number(settingsRes.rows[0]?.count ?? 0),
    };

    const statsVerified =
      stats.services === 9 &&
      stats.categories === 4 &&
      stats.gallery === 6 &&
      stats.offers === 3 &&
      stats.reviews === 0 &&
      stats.blog === 0 &&
      stats.media === 15 &&
      stats.settings === 6;

    record(
      1,
      'إحصائيات حقيقية من قاعدة البيانات دون أرقام وهمية (Real DB Metrics)',
      statsVerified,
      `Services=${stats.services}, Categories=${stats.categories}, Gallery=${stats.gallery}, Offers=${stats.offers}, Reviews=${stats.reviews}, Blog=${stats.blog}, Media=${stats.media}, Settings=${stats.settings}`
    );

    // --------------------------------------------------------------------------
    // Test 2: Provision Test Admin Users with Different Roles in Sandbox DB
    // --------------------------------------------------------------------------
    const now = Date.now();
    const testPassword = 'SecureAdminPassword2026!';
    const testHash = await hashPassword(testPassword);

    const superAdminId = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const editorId = crypto.randomUUID();

    await client.execute({
      sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, failed_login_attempts, security_generation, login_generation, created_at, updated_at)
            VALUES 
              (?, 'role_super_admin', 'super_admin_p5', 'super_p5@alorspa.com', ?, 'مدير عام النظام', 1, 0, 1, 1, ?, ?),
              (?, 'role_spa_manager', 'spa_manager_p5', 'manager_p5@alorspa.com', ?, 'مديرة السبا', 1, 0, 1, 1, ?, ?),
              (?, 'role_content_editor', 'editor_p5', 'editor_p5@alorspa.com', ?, 'محررة المحتوى', 1, 0, 1, 1, ?, ?);`,
      args: [superAdminId, testHash, now, now, managerId, testHash, now, now, editorId, testHash, now, now],
    });

    const superSession = await createSession(client, { userId: superAdminId, now });
    const managerSession = await createSession(client, { userId: managerId, now });
    const editorSession = await createSession(client, { userId: editorId, now });

    const superAuth = await validateSession(client, superSession.rawToken);
    const managerAuth = await validateSession(client, managerSession.rawToken);
    const editorAuth = await validateSession(client, editorSession.rawToken);

    const sessionsValid = Boolean(superAuth.valid && managerAuth.valid && editorAuth.valid);
    record(
      2,
      'التحقق من صحة جلسات المشرفين الموثوقة (Server-verified sessions)',
      sessionsValid,
      `SuperAdmin=${superAuth.valid}, Manager=${managerAuth.valid}, Editor=${editorAuth.valid}`
    );

    // --------------------------------------------------------------------------
    // Test 3: Unauthenticated Access Guard
    // --------------------------------------------------------------------------
    const unauthenticatedCheck = await validateSession(client, 'invalid_or_missing_token');
    const blockedWithoutSession = !unauthenticatedCheck.valid;
    record(
      3,
      'منع الوصول دون جلسة صالحة (Blocked Access Without Valid Session)',
      blockedWithoutSession,
      `Reason: ${unauthenticatedCheck.reason}`
    );

    // --------------------------------------------------------------------------
    // Test 4: Super Admin Universally Authorized Across All 12 Sections
    // --------------------------------------------------------------------------
    const superUser = superAuth.user!;
    let superAdminAllAllowed = true;
    for (const item of ADMIN_NAV_ITEMS) {
      if (!canAccessSection(superUser, item.requiredPermission)) {
        superAdminAllAllowed = false;
        break;
      }
    }
    record(
      4,
      'المدير العام يمتلك صلاحية الوصول لكافة أقسام لوحة الإدارة الـ 12 (Universal Access)',
      superAdminAllAllowed,
      `Super Admin total accessible sections: ${getAccessibleNavItems(superUser).length} of ${ADMIN_NAV_ITEMS.length}`
    );

    // --------------------------------------------------------------------------
    // Test 5: Spa Manager RBAC Enforcement (Allowed content, Forbidden from security/settings)
    // --------------------------------------------------------------------------
    const managerUser = managerAuth.user!;
    const managerCanServices = canAccessSection(managerUser, 'services:read');
    const managerCanOffers = canAccessSection(managerUser, 'offers:read');
    const managerCanReviews = canAccessSection(managerUser, 'reviews:read');
    const managerCanUsers = canAccessSection(managerUser, 'users:read');
    const managerCanRoles = canAccessSection(managerUser, 'roles:read');
    const managerCanSettings = canAccessSection(managerUser, 'settings:read');
    const managerCanLogs = canAccessSection(managerUser, 'logs:read');

    const managerEnforcement =
      managerCanServices &&
      managerCanOffers &&
      managerCanReviews &&
      !managerCanUsers &&
      !managerCanRoles &&
      !managerCanSettings &&
      !managerCanLogs;

    record(
      5,
      'تطبيق RBAC لمديرة السبا: السماح بالمحتوى وحظر إدارة المستخدمين والإعدادات (Spa Manager RBAC)',
      managerEnforcement,
      `Services=${managerCanServices}, Reviews=${managerCanReviews}, Users=${managerCanUsers}, Settings=${managerCanSettings}, Logs=${managerCanLogs}`
    );

    // --------------------------------------------------------------------------
    // Test 6: Content Editor RBAC Enforcement (Allowed drafts/gallery, Forbidden reviews/users/settings)
    // --------------------------------------------------------------------------
    const editorUser = editorAuth.user!;
    const editorCanServices = canAccessSection(editorUser, 'services:read');
    const editorCanGallery = canAccessSection(editorUser, 'gallery:read');
    const editorCanReviews = canAccessSection(editorUser, 'reviews:read');
    const editorCanUsers = canAccessSection(editorUser, 'users:read');
    const editorCanSettings = canAccessSection(editorUser, 'settings:read');

    const editorEnforcement =
      editorCanServices &&
      editorCanGallery &&
      !editorCanReviews &&
      !editorCanUsers &&
      !editorCanSettings;

    record(
      6,
      'تطبيق RBAC لمحررة المحتوى: حظر اعتماد المراجعات وإدارة النظام (Content Editor RBAC)',
      editorEnforcement,
      `Services=${editorCanServices}, Gallery=${editorCanGallery}, Reviews=${editorCanReviews}, Users=${editorCanUsers}, Settings=${editorCanSettings}`
    );

    // --------------------------------------------------------------------------
    // Test 7: Sidebar Navigation Filtering (UI hides unauthorized links based on server session)
    // --------------------------------------------------------------------------
    const superNav = getAccessibleNavItems(superUser);
    const managerNav = getAccessibleNavItems(managerUser);
    const editorNav = getAccessibleNavItems(editorUser);

    const navFilteringPassed =
      superNav.length === 12 &&
      managerNav.length === 8 &&
      editorNav.length === 7 &&
      !managerNav.some((i) => i.id === 'users' || i.id === 'roles' || i.id === 'settings' || i.id === 'activity-logs') &&
      !editorNav.some((i) => i.id === 'reviews' || i.id === 'users' || i.id === 'roles');

    record(
      7,
      'فلترة عناصر القائمة الجانبية تلقائياً حسب صلاحيات الجلسة (Nav Filtering by Role)',
      navFilteringPassed,
      `SuperAdmin items=${superNav.length}, Manager items=${managerNav.length}, Editor items=${editorNav.length}`
    );

    // --------------------------------------------------------------------------
    // Test 8: All 12 Sections Routes and Files Exist
    // --------------------------------------------------------------------------
    const requiredFiles = [
      'src/layouts/AdminLayout.astro',
      'src/components/admin/AdminSidebar.astro',
      'src/components/admin/AdminHeader.astro',
      'src/components/admin/StatCard.astro',
      'src/components/admin/EmptyState.astro',
      'src/components/admin/AccessDenied.astro',
      'src/pages/admin/index.astro',
      'src/pages/admin/services/index.astro',
      'src/pages/admin/categories/index.astro',
      'src/pages/admin/offers/index.astro',
      'src/pages/admin/gallery/index.astro',
      'src/pages/admin/reviews/index.astro',
      'src/pages/admin/blog/index.astro',
      'src/pages/admin/media/index.astro',
      'src/pages/admin/settings/index.astro',
      'src/pages/admin/users/index.astro',
      'src/pages/admin/roles/index.astro',
      'src/pages/admin/activity-logs/index.astro',
    ];

    let allFilesExist = true;
    for (const f of requiredFiles) {
      if (!fs.existsSync(path.resolve(process.cwd(), f))) {
        allFilesExist = false;
        console.error(`Missing file: ${f}`);
        break;
      }
    }

    record(
      8,
      'اكتمال ملفات الأقسام الـ 12 والمكونات الأساسية للوحة الإدارة (All 12 Sections Files)',
      allFilesExist,
      `Verified ${requiredFiles.length} files on disk.`
    );

    // --------------------------------------------------------------------------
    // Test 9: Protected WhatsApp Setting Verification (Immutable Constraint)
    // --------------------------------------------------------------------------
    const waSetting = await client.execute({
      sql: `SELECT key, value_raw, is_immutable FROM site_settings WHERE key = 'contact.whatsapp';`,
      args: [],
    });

    const waRow = waSetting.rows[0];
    const waProtected =
      waRow &&
      waRow.value_raw === '966553543192' &&
      Number(waRow.is_immutable) === 1;

    record(
      9,
      'حماية رقم الواتساب الرسمي وقيد الأمان غير القابل للتغيير (WhatsApp Immutability)',
      Boolean(waProtected),
      `Value: ${waRow?.value_raw}, Immutable: ${waRow?.is_immutable}`
    );

    // --------------------------------------------------------------------------
    // Test 10: Breadcrumbs and Metadata Resolution
    // --------------------------------------------------------------------------
    const dashboardMeta = getSectionMetadata('/admin');
    const servicesMeta = getSectionMetadata('/admin/services');
    const usersMeta = getSectionMetadata('/admin/users');

    const metaCorrect =
      dashboardMeta?.id === 'dashboard' &&
      servicesMeta?.id === 'services' &&
      usersMeta?.id === 'users';

    record(
      10,
      'التحقق من صحة مسارات التنقل وبيانات الأقسام (Route Metadata Resolution)',
      metaCorrect,
      `Dashboard=${dashboardMeta?.titleAr}, Services=${servicesMeta?.titleAr}, Users=${usersMeta?.titleAr}`
    );

  } finally {
    // Close client connection to release Windows file locks
    try {
      client.close();
    } catch {}

    // Allow Windows handle release
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup sandbox database
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {}
  }

  // Summary
  console.log('\n================================================================');
  console.log(' AUDIT SUMMARY:');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(` Total Tests: ${results.length}`);
  console.log(` Passed: ${passedCount}`);
  console.log(` Failed: ${results.length - passedCount}`);
  console.log('================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runMilestone4Phase5Tests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
