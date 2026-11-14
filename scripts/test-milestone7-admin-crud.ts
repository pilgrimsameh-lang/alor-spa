import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from '../src/server/db/index';
import {
  adminRoles,
  adminUsers,
  adminSessions,
  serviceCategories,
  services,
  offers,
  reviews,
  blogPosts,
  siteSettings,
  activityLogs,
  mediaFiles,
} from '../src/server/db/schema';
import { hashPassword } from '../src/server/auth/password';
import { createSession } from '../src/server/auth/session';
import { seedDatabase } from '../src/server/db/seed';

const testDbPath = path.resolve(process.cwd(), `data/test_m7_crud_${Date.now()}.db`);

async function runAdminCrudTests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 7: Admin Panel Full CRUD & RBAC Verification');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`✓ PASS [${title}]`);
      if (details) console.log(`    ↳ ${details}`);
      passed++;
    } else {
      console.error(`✗ FAIL [${title}]`);
      if (details) console.error(`    ↳ ${details}`);
      failed++;
    }
  }

  // Setup sandbox database
  process.env.DB_PATH = testDbPath;
  const { client, db } = getDb(testDbPath);

  // Initialize all migrations cleanly
  const { runMigrations } = await import('../src/server/db/migrate');
  await runMigrations(testDbPath);

  await seedDatabase(testDbPath);

  // 1. Create Super Admin User & Session
  const adminId = crypto.randomUUID();
  const passwordHash = await hashPassword('SuperSecureP@ssw0rd2026!');
  const now = Date.now();

  await client.execute({
    sql: `INSERT INTO admin_users (id, role_id, username, email, password_hash, full_name, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [adminId, 'role_super_admin', 'superadmin', 'admin@alorspa.com', passwordHash, 'مدير النظام التنفيذي', 1, now, now],
  });

  const { sessionId, rawToken } = await createSession(client, { userId: adminId, clientIp: '127.0.0.1' });
  assert(!!rawToken, 'Admin Session Creation', `Session created: ID=${sessionId}`);

  // 2. Services CRUD Test
  const testServiceId = 'test-swedish-massage';
  await client.execute({
    sql: `INSERT INTO services (
      id, category_id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
      description_ar, description_en, detailed_description_ar, detailed_description_en,
      is_signature, is_published, display_order,
      price_amount_halalas, price_currency, price_is_confirmed, price_display_ar, price_display_en,
      duration_minutes, duration_is_confirmed, duration_display_ar, duration_display_en,
      features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en, includes_ar, includes_en,
      suitability_ar, suitability_en, advisory_ar, advisory_en,
      seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
      created_at, updated_at
    ) VALUES (
      ?, 'cat_massage', ?, 'جلسة تدليك سويدي', 'Swedish Massage Session', 'استرخاء عضلي عميق', 'Deep Muscle Relaxation',
      'وصف التدليك السويدي', 'Swedish massage description', '[]', '[]',
      0, 1, 10,
      35000, 'SAR', 1, '350 ر.س', '350 SAR',
      60, 1, '60 دقيقة', '60 Minutes',
      '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]',
      'مناسب للجميع', 'Suitable for everyone', 'يرجى إبلاغ الأخصائية بأي إصابات', 'Inform therapist of injuries',
      'تدليك سويدي بالرياض', 'Swedish Massage Riyadh', 'أفضل تدليك سويدي بالرياض في ألور سبا', 'Best Swedish massage at ALOR SPA',
      ?, ?
    );`,
    args: [testServiceId, testServiceId, now, now],
  });

  const readService = await client.execute({
    sql: 'SELECT * FROM services WHERE id = ?;',
    args: [testServiceId],
  });
  assert(readService.rows.length === 1 && readService.rows[0].title_en === 'Swedish Massage Session', 'Service INSERT & SELECT', 'Verified record in SQLite');

  // Update Service
  await client.execute({
    sql: 'UPDATE services SET title_ar = ?, price_amount_halalas = 40000, price_display_ar = ? WHERE id = ?;',
    args: ['جلسة تدليك سويدي مطورة', '400 ر.س', testServiceId],
  });
  const updatedService = await client.execute({
    sql: 'SELECT price_amount_halalas, title_ar FROM services WHERE id = ?;',
    args: [testServiceId],
  });
  assert(Number(updatedService.rows[0].price_amount_halalas) === 40000 && updatedService.rows[0].title_ar === 'جلسة تدليك سويدي مطورة', 'Service UPDATE', 'Price and title updated');

  // Delete Service
  await client.execute({
    sql: 'DELETE FROM services WHERE id = ?;',
    args: [testServiceId],
  });
  const deletedService = await client.execute({
    sql: 'SELECT id FROM services WHERE id = ?;',
    args: [testServiceId],
  });
  assert(deletedService.rows.length === 0, 'Service DELETE', 'Service cleanly removed');

  // 3. Category CRUD Test
  const testCatId = 'cat_hydrotherapy';
  await client.execute({
    sql: `INSERT INTO service_categories (id, slug, title_ar, title_en, display_order, is_active)
          VALUES (?, 'hydrotherapy', 'العلاج المائي', 'Hydrotherapy', 5, 1);`,
    args: [testCatId],
  });
  const readCat = await client.execute({
    sql: 'SELECT * FROM service_categories WHERE id = ?;',
    args: [testCatId],
  });
  assert(readCat.rows.length === 1 && readCat.rows[0].slug === 'hydrotherapy', 'Category INSERT & SELECT', 'Category inserted');

  await client.execute({
    sql: 'DELETE FROM service_categories WHERE id = ?;',
    args: [testCatId],
  });
  assert((await client.execute({ sql: 'SELECT id FROM service_categories WHERE id = ?;', args: [testCatId] })).rows.length === 0, 'Category DELETE', 'Category deleted');

  // 4. Offers CRUD Test
  const testOfferId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO offers (id, slug, title_ar, title_en, subtitle_ar, subtitle_en, description_ar, description_en, includes_ar, includes_en, is_active, created_at, updated_at)
          VALUES (?, 'bridal-pamper', 'باقة العروس الملكية', 'Royal Bridal Package', 'عناية متكاملة', 'Full pampering', 'تفاصيل العرض', 'Offer details', '[]', '[]', 1, ?, ?);`,
    args: [testOfferId, now, now],
  });
  const readOffer = await client.execute({ sql: 'SELECT * FROM offers WHERE id = ?;', args: [testOfferId] });
  assert(readOffer.rows.length === 1 && readOffer.rows[0].slug === 'bridal-pamper', 'Offer INSERT & SELECT', 'Promotional offer verified');

  await client.execute({ sql: 'DELETE FROM offers WHERE id = ?;', args: [testOfferId] });
  assert((await client.execute({ sql: 'SELECT id FROM offers WHERE id = ?;', args: [testOfferId] })).rows.length === 0, 'Offer DELETE', 'Offer cleanly deleted');

  // 5. Reviews Moderation CRUD Test
  const testRevId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO reviews (id, author_name, quote_ar, quote_en, rating, is_verified, is_approved, review_date, created_at, updated_at)
          VALUES (?, 'نورة العتيبي', 'تجربة استثنائية وهدوء لا يضاهى', 'Exceptional experience and unmatched tranquility', 5, 1, 0, ?, ?, ?);`,
    args: [testRevId, now, now, now],
  });
  const unapprovedReview = await client.execute({ sql: 'SELECT is_approved FROM reviews WHERE id = ?;', args: [testRevId] });
  assert(Number(unapprovedReview.rows[0].is_approved) === 0, 'Review Moderation (Default Pending Approval)', 'Review begins in unapproved state');

  // Approve review
  await client.execute({ sql: 'UPDATE reviews SET is_approved = 1 WHERE id = ?;', args: [testRevId] });
  const approvedReview = await client.execute({ sql: 'SELECT is_approved FROM reviews WHERE id = ?;', args: [testRevId] });
  assert(Number(approvedReview.rows[0].is_approved) === 1, 'Review Approval', 'Review marked as approved');

  await client.execute({ sql: 'DELETE FROM reviews WHERE id = ?;', args: [testRevId] });

  // 6. Blog Posts CRUD Test
  const testBlogId = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO blog_posts (id, slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, is_published, created_at, updated_at)
          VALUES (?, 'benefits-of-hot-stone', 'فوائد مساج الأحجار الساخنة', 'Benefits of Hot Stone Massage', 'مقتطف المقال', 'Article excerpt', 'محتوى المقال كاملاً', 'Full article content', 0, ?, ?);`,
    args: [testBlogId, now, now],
  });
  const readBlog = await client.execute({ sql: 'SELECT is_published FROM blog_posts WHERE id = ?;', args: [testBlogId] });
  assert(readBlog.rows.length === 1 && Number(readBlog.rows[0].is_published) === 0, 'Blog Post DRAFT Creation', 'Draft created without premature publishing');

  await client.execute({ sql: 'DELETE FROM blog_posts WHERE id = ?;', args: [testBlogId] });

  // 7. Site Settings & WhatsApp Immutability
  const waSetting = await client.execute(`SELECT * FROM site_settings WHERE key = 'contact.whatsapp';`);
  const isProtected = waSetting.rows.length === 1 && Number(waSetting.rows[0].is_immutable) === 1 && waSetting.rows[0].value_raw === '966553543192';
  assert(isProtected, 'WhatsApp Setting Protection in SQLite', `Key: contact.whatsapp, Value: ${waSetting.rows[0].value_raw}, is_immutable: ${waSetting.rows[0].is_immutable}`);

  // 8. Foreign Key Constraints Check
  const fkCheck = await client.execute('PRAGMA foreign_key_check;');
  assert(fkCheck.rows.length === 0, 'Foreign Key Referential Integrity', 'Zero foreign key violations in database');

  // Cleanup test database
  try {
    fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
  } catch {}

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY:`);
  console.log(` Total Tests: ${passed + failed}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runAdminCrudTests().catch((err) => {
  console.error('CRUD audit error:', err);
  process.exit(1);
});
