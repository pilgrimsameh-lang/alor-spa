import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { getDb } from './src/server/db/index';
import { runMigrations } from './src/server/db/migrate';
import { seedDatabase } from './src/server/db/seed';

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

async function runAllTests() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 2: Hardened Database Integrity Audit');
  console.log('================================================================\n');

  // Baseline tracking of actual development database
  const devDbPath = path.resolve(process.cwd(), './data/alor_spa.db');
  const { client } = getDb();

  const initialDevCounts = {
    services: Number((await client.execute('SELECT COUNT(*) as c FROM services;')).rows[0].c),
    settings: Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c),
    media: Number((await client.execute('SELECT COUNT(*) as c FROM media_files;')).rows[0].c),
    roles: Number((await client.execute('SELECT COUNT(*) as c FROM admin_roles;')).rows[0].c),
    categories: Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c),
  };

  console.log('--- PART 1: READ-ONLY AUDIT ON DEVELOPMENT DATABASE ---');

  // 1. Database initializes successfully
  try {
    const q1 = await client.execute('SELECT 1 as initialized;');
    const ok = q1.rows.length === 1 && q1.rows[0].initialized === 1;
    record(1, 'Database initializes successfully', ok, 'SQLite client connected and executed basic query');
  } catch (err: any) {
    record(1, 'Database initializes successfully', false, err.message);
  }

  // 2. All 12 approved tables exist
  const expectedTables = [
    'activity_logs',
    'admin_roles',
    'admin_sessions',
    'admin_users',
    'blog_posts',
    'gallery_items',
    'media_files',
    'offers',
    'reviews',
    'service_categories',
    'services',
    'site_settings',
  ].sort();

  try {
    const q2 = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name;"
    );
    const actualTables = q2.rows.map((r: any) => r.name).sort();
    const countOk = actualTables.length === 12;
    const matchOk = JSON.stringify(actualTables) === JSON.stringify(expectedTables);
    record(
      2,
      'All 12 approved tables exist',
      countOk && matchOk,
      `Exact 12 tables found: ${actualTables.join(', ')}`
    );
  } catch (err: any) {
    record(2, 'All 12 approved tables exist', false, err.message);
  }

  // 3. All foreign keys are valid
  try {
    const q3 = await client.execute('PRAGMA foreign_key_check;');
    const valid = q3.rows.length === 0;
    record(
      3,
      'All foreign keys are valid',
      valid,
      valid ? 'Zero foreign-key reference violations found' : `Found ${q3.rows.length} FK violations`
    );
  } catch (err: any) {
    record(3, 'All foreign keys are valid', false, err.message);
  }

  // 4. Foreign-key enforcement is enabled
  try {
    const q4 = await client.execute('PRAGMA foreign_keys;');
    const enabled = q4.rows[0]?.foreign_keys === 1;
    record(4, 'Foreign-key enforcement is enabled', enabled, `PRAGMA foreign_keys = ${q4.rows[0]?.foreign_keys}`);
  } catch (err: any) {
    record(4, 'Foreign-key enforcement is enabled', false, err.message);
  }

  // 5. WAL mode is enabled
  try {
    const q5 = await client.execute('PRAGMA journal_mode;');
    const walOk = String(q5.rows[0]?.journal_mode).toLowerCase() === 'wal';
    record(5, 'WAL mode is enabled', walOk, `PRAGMA journal_mode = ${q5.rows[0]?.journal_mode}`);
  } catch (err: any) {
    record(5, 'WAL mode is enabled', false, err.message);
  }

  // 6. Monetary fields use integer halalas
  try {
    const srvInfo = await client.execute("PRAGMA table_info('services');");
    const offInfo = await client.execute("PRAGMA table_info('offers');");
    const srvCol = srvInfo.rows.find((r: any) => r.name === 'price_amount_halalas');
    const offCol = offInfo.rows.find((r: any) => r.name === 'price_amount_halalas');
    const isInteger =
      String(srvCol?.type).toLowerCase() === 'integer' &&
      String(offCol?.type).toLowerCase() === 'integer';
    record(
      6,
      'Monetary fields use integer halalas',
      isInteger,
      `services.price_amount_halalas (${srvCol?.type}), offers.price_amount_halalas (${offCol?.type})`
    );
  } catch (err: any) {
    record(6, 'Monetary fields use integer halalas', false, err.message);
  }

  // 7. Unconfirmed prices remain nullable
  try {
    const q7 = await client.execute('SELECT slug, price_amount_halalas, price_is_confirmed FROM services;');
    const allNull = q7.rows.every((r: any) => r.price_amount_halalas === null && r.price_is_confirmed === 0);
    record(
      7,
      'Unconfirmed prices remain nullable',
      allNull,
      `All ${q7.rows.length} seeded services have NULL halalas and price_is_confirmed = 0`
    );
  } catch (err: any) {
    record(7, 'Unconfirmed prices remain nullable', false, err.message);
  }

  // 8. Reviews default to unverified and unapproved
  try {
    const revInfo = await client.execute("PRAGMA table_info('reviews');");
    const verifiedCol = revInfo.rows.find((r: any) => r.name === 'is_verified');
    const approvedCol = revInfo.rows.find((r: any) => r.name === 'is_approved');
    const defOk =
      String(verifiedCol?.dflt_value).includes('0') &&
      String(approvedCol?.dflt_value).includes('0');
    record(
      8,
      'Reviews default to unverified and unapproved',
      defOk,
      `is_verified default: ${verifiedCol?.dflt_value}, is_approved default: ${approvedCol?.dflt_value}`
    );
  } catch (err: any) {
    record(8, 'Reviews default to unverified and unapproved', false, err.message);
  }

  // 9. Session schema stores token hashes rather than raw tokens
  try {
    const sesInfo = await client.execute("PRAGMA table_info('admin_sessions');");
    const cols = sesInfo.rows.map((r: any) => r.name);
    const hasHash = cols.includes('token_hash');
    const hasRaw = cols.includes('token') || cols.includes('session_token');
    const hashOk = hasHash && !hasRaw;
    record(
      9,
      'Session schema stores token hashes rather than raw tokens',
      hashOk,
      `Columns present: ${cols.join(', ')} (token_hash present: ${hasHash}, raw token absent: ${!hasRaw})`
    );
  } catch (err: any) {
    record(9, 'Session schema stores token hashes rather than raw tokens', false, err.message);
  }

  // 10. Location coordinates remain null
  try {
    const q10 = await client.execute("SELECT value_raw, value_ar FROM site_settings WHERE key = 'contact.coordinates';");
    const coordsNull = q10.rows[0]?.value_raw === null && (!q10.rows[0]?.value_ar || q10.rows[0]?.value_ar === '');
    record(
      10,
      'Location coordinates remain null (no unconfirmed Riyadh coordinates)',
      coordsNull,
      `value_raw: ${q10.rows[0]?.value_raw}, value_ar: '${q10.rows[0]?.value_ar}' (zero unverified coordinates)`
    );
  } catch (err: any) {
    record(10, 'Location coordinates remain null', false, err.message);
  }

  // 11. Existing valid services, media, settings, and relationships remain intact
  try {
    const fkCheck = await client.execute('PRAGMA foreign_key_check;');
    const srvCheck = await client.execute('SELECT COUNT(*) as c FROM services;');
    const mediaCheck = await client.execute('SELECT COUNT(*) as c FROM media_files;');
    const waCheck = await client.execute("SELECT value_raw FROM site_settings WHERE key = 'contact.whatsapp';");

    const intact =
      fkCheck.rows.length === 0 &&
      srvCheck.rows[0]?.c === 6 &&
      mediaCheck.rows[0]?.c === 12 &&
      waCheck.rows[0]?.value_raw === '966553543192';

    record(
      11,
      'Existing valid services, media, settings, and relationships remain intact',
      intact,
      `6 services, 12 media files, WhatsApp = 966553543192, 0 FK violations`
    );
  } catch (err: any) {
    record(11, 'Existing valid services, media, settings, and relationships remain intact', false, err.message);
  }

  console.log('\n--- PART 2: MUTATING & CONSTRAINT REGRESSION TESTS IN DISPOSABLE TEST DATABASE ---');

  const disposableDbPath = './data/test_disposable.db';
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${disposableDbPath}${ext}`;
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  // 12. Disposable database setup & migration
  let dispClient: any = null;
  try {
    await runMigrations(disposableDbPath);
    dispClient = createClient({ url: `file:${path.resolve(process.cwd(), disposableDbPath)}` });
    await dispClient.execute('PRAGMA foreign_keys = ON;');
    const migCheck = await dispClient.execute('PRAGMA integrity_check;');
    const migOk = migCheck.rows[0]?.integrity_check === 'ok';
    record(
      12,
      'Disposable database initializes and applies migrations cleanly',
      migOk,
      `PRAGMA integrity_check = ${migCheck.rows[0]?.integrity_check}`
    );
  } catch (err: any) {
    record(12, 'Disposable database initializes and applies migrations cleanly', false, err.message);
  }

  // 13. Seed idempotency tests execute strictly in disposable database
  try {
    const stats1 = await seedDatabase(disposableDbPath);
    const countAfter1 = await dispClient.execute('SELECT COUNT(*) as c FROM services;');
    const stats2 = await seedDatabase(disposableDbPath);
    const countAfter2 = await dispClient.execute('SELECT COUNT(*) as c FROM services;');

    const idempotent =
      countAfter1.rows[0].c === 6 &&
      countAfter2.rows[0].c === 6 &&
      stats1.servicesCount === stats2.servicesCount;

    record(
      13,
      'Seed idempotency tests use only the disposable database',
      idempotent,
      `Disposable DB service count remained 6 across repeated seed runs (dev DB never touched)`
    );
  } catch (err: any) {
    record(13, 'Seed idempotency tests use only the disposable database', false, err.message);
  }

  // 14. Media deletion restrictions work (ON DELETE RESTRICT)
  try {
    let deletionBlocked = false;
    try {
      await dispClient.execute("DELETE FROM media_files WHERE id = 'med_srv_relaxation_massage';");
    } catch (fkErr: any) {
      deletionBlocked =
        fkErr.message.includes('FOREIGN KEY') ||
        fkErr.message.includes('constraint failed');
    }
    record(
      14,
      'Media deletion restrictions work (ON DELETE RESTRICT)',
      deletionBlocked,
      deletionBlocked
        ? 'Foreign key constraint blocked deletion of actively referenced media file'
        : 'ERROR: Media deletion was NOT blocked!'
    );
  } catch (err: any) {
    record(14, 'Media deletion restrictions work', false, err.message);
  }

  // 15. WhatsApp seed cannot overwrite an existing value
  try {
    await dispClient.execute(
      "UPDATE site_settings SET value_raw = '966599999999', value_ar = '966599999999', value_en = '966599999999' WHERE key = 'contact.whatsapp';"
    );
    await seedDatabase(disposableDbPath);
    const checkWa = await dispClient.execute("SELECT value_raw FROM site_settings WHERE key = 'contact.whatsapp';");
    const waPreserved = checkWa.rows[0]?.value_raw === '966599999999';
    record(
      15,
      'WhatsApp seed cannot overwrite an existing value (disposable DB)',
      waPreserved,
      waPreserved
        ? 'Pre-existing custom WhatsApp number preserved intact across re-seeding'
        : `Overwritten with: ${checkWa.rows[0]?.value_raw}`
    );
  } catch (err: any) {
    record(15, 'WhatsApp seed cannot overwrite an existing value', false, err.message);
  }

  // 16. Running migrations twice does not corrupt schema
  try {
    let migTwiceOk = false;
    try {
      await runMigrations(disposableDbPath);
      const integrity = await dispClient.execute('PRAGMA integrity_check;');
      migTwiceOk = integrity.rows[0]?.integrity_check === 'ok';
    } catch {
      migTwiceOk = false;
    }
    record(
      16,
      'Running migrations twice does not corrupt schema (disposable DB)',
      migTwiceOk,
      'Re-running migrations executed idempotently with PRAGMA integrity_check = ok'
    );
  } catch (err: any) {
    record(16, 'Running migrations twice does not corrupt schema', false, err.message);
  }

  // 17. Negative service prices are rejected by SQLite
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO services (
          id, category_id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, detailed_description_ar, detailed_description_en,
          features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en,
          includes_ar, includes_en, suitability_ar, suitability_en, advisory_ar, advisory_en,
          seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
          created_at, updated_at, price_amount_halalas
        ) VALUES (
          'chk-srv-neg-price', 'cat_massage', 'chk-srv-neg-price', 'س', 's', 's', 's',
          'd', 'd', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]',
          '[]', '[]', 'u', 'u', 'a', 'a', 'st', 'st', 'sd', 'sd',
          1, 1, -500
        );
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_services_price_positive');
    }
    record(
      17,
      'Negative service prices are rejected by SQLite',
      rejected,
      rejected
        ? 'SQLite rejected price_amount_halalas = -500 via chk_services_price_positive'
        : 'ERROR: Negative service price was NOT rejected!'
    );
  } catch (err: any) {
    record(17, 'Negative service prices are rejected by SQLite', false, err.message);
  }

  // 18. Negative offer prices are rejected by SQLite
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO offers (
          id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, includes_ar, includes_en,
          created_at, updated_at, price_amount_halalas
        ) VALUES (
          'chk-off-neg-price', 'chk-off-neg-price', 'ع', 'o', 's', 's',
          'd', 'd', '[]', '[]', 1, 1, -100
        );
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_offers_price_positive');
    }
    record(
      18,
      'Negative offer prices are rejected by SQLite',
      rejected,
      rejected
        ? 'SQLite rejected price_amount_halalas = -100 via chk_offers_price_positive'
        : 'ERROR: Negative offer price was NOT rejected!'
    );
  } catch (err: any) {
    record(18, 'Negative offer prices are rejected by SQLite', false, err.message);
  }

  // 19. Zero and negative service durations are rejected
  try {
    let zeroRejected = false;
    let negRejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO services (
          id, category_id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, detailed_description_ar, detailed_description_en,
          features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en,
          includes_ar, includes_en, suitability_ar, suitability_en, advisory_ar, advisory_en,
          seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
          created_at, updated_at, duration_minutes
        ) VALUES (
          'chk-srv-zero-dur', 'cat_massage', 'chk-srv-zero-dur', 'س', 's', 's', 's',
          'd', 'd', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]',
          '[]', '[]', 'u', 'u', 'a', 'a', 'st', 'st', 'sd', 'sd',
          1, 1, 0
        );
      `);
    } catch (e: any) {
      zeroRejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_services_duration_positive');
    }
    try {
      await dispClient.execute(`
        INSERT INTO services (
          id, category_id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, detailed_description_ar, detailed_description_en,
          features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en,
          includes_ar, includes_en, suitability_ar, suitability_en, advisory_ar, advisory_en,
          seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
          created_at, updated_at, duration_minutes
        ) VALUES (
          'chk-srv-neg-dur', 'cat_massage', 'chk-srv-neg-dur', 'س', 's', 's', 's',
          'd', 'd', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]',
          '[]', '[]', 'u', 'u', 'a', 'a', 'st', 'st', 'sd', 'sd',
          1, 1, -15
        );
      `);
    } catch (e: any) {
      negRejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_services_duration_positive');
    }
    const passed = zeroRejected && negRejected;
    record(
      19,
      'Zero and negative service durations are rejected',
      passed,
      passed
        ? 'SQLite rejected duration_minutes = 0 and -15 via chk_services_duration_positive'
        : `zeroRejected: ${zeroRejected}, negRejected: ${negRejected}`
    );
  } catch (err: any) {
    record(19, 'Zero and negative service durations are rejected', false, err.message);
  }

  // 20. Zero and negative offer durations are rejected
  try {
    let zeroRejected = false;
    let negRejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO offers (
          id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, includes_ar, includes_en,
          created_at, updated_at, duration_minutes
        ) VALUES (
          'chk-off-zero-dur', 'chk-off-zero-dur', 'ع', 'o', 's', 's',
          'd', 'd', '[]', '[]', 1, 1, 0
        );
      `);
    } catch (e: any) {
      zeroRejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_offers_duration_positive');
    }
    try {
      await dispClient.execute(`
        INSERT INTO offers (
          id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, includes_ar, includes_en,
          created_at, updated_at, duration_minutes
        ) VALUES (
          'chk-off-neg-dur', 'chk-off-neg-dur', 'ع', 'o', 's', 's',
          'd', 'd', '[]', '[]', 1, 1, -30
        );
      `);
    } catch (e: any) {
      negRejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_offers_duration_positive');
    }
    const passed = zeroRejected && negRejected;
    record(
      20,
      'Zero and negative offer durations are rejected',
      passed,
      passed
        ? 'SQLite rejected duration_minutes = 0 and -30 via chk_offers_duration_positive'
        : `zeroRejected: ${zeroRejected}, negRejected: ${negRejected}`
    );
  } catch (err: any) {
    record(20, 'Zero and negative offer durations are rejected', false, err.message);
  }

  // 21. Confirmed prices cannot have NULL amounts
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        UPDATE services SET price_is_confirmed = 1, price_amount_halalas = NULL WHERE id = 'relaxation-massage';
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_services_price_confirmed');
    }
    record(
      21,
      'Confirmed prices cannot have NULL amounts',
      rejected,
      rejected
        ? 'SQLite rejected price_is_confirmed = 1 with NULL amount via chk_services_price_confirmed'
        : 'ERROR: Confirmed price with NULL amount was NOT rejected!'
    );
  } catch (err: any) {
    record(21, 'Confirmed prices cannot have NULL amounts', false, err.message);
  }

  // 22. Confirmed durations cannot have NULL durations
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        UPDATE services SET duration_is_confirmed = 1, duration_minutes = NULL WHERE id = 'relaxation-massage';
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_services_duration_confirmed');
    }
    record(
      22,
      'Confirmed durations cannot have NULL durations',
      rejected,
      rejected
        ? 'SQLite rejected duration_is_confirmed = 1 with NULL duration via chk_services_duration_confirmed'
        : 'ERROR: Confirmed duration with NULL duration was NOT rejected!'
    );
  } catch (err: any) {
    record(22, 'Confirmed durations cannot have NULL durations', false, err.message);
  }

  // 23. Ratings below 1 are rejected
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO reviews (
          id, author_name, quote_ar, quote_en, rating, review_date, created_at, updated_at
        ) VALUES (
          'chk-rev-low', 'Tester', 'رائع', 'Great', 0, 1, 1, 1
        );
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_reviews_rating_range');
    }
    record(
      23,
      'Ratings below 1 are rejected',
      rejected,
      rejected
        ? 'SQLite rejected rating = 0 via chk_reviews_rating_range'
        : 'ERROR: Rating 0 was NOT rejected!'
    );
  } catch (err: any) {
    record(23, 'Ratings below 1 are rejected', false, err.message);
  }

  // 24. Ratings above 5 are rejected
  try {
    let rejected = false;
    try {
      await dispClient.execute(`
        INSERT INTO reviews (
          id, author_name, quote_ar, quote_en, rating, review_date, created_at, updated_at
        ) VALUES (
          'chk-rev-high', 'Tester', 'رائع', 'Great', 6, 1, 1, 1
        );
      `);
    } catch (e: any) {
      rejected = e.message.includes('CHECK constraint failed') && e.message.includes('chk_reviews_rating_range');
    }
    record(
      24,
      'Ratings above 5 are rejected',
      rejected,
      rejected
        ? 'SQLite rejected rating = 6 via chk_reviews_rating_range'
        : 'ERROR: Rating 6 was NOT rejected!'
    );
  } catch (err: any) {
    record(24, 'Ratings above 5 are rejected', false, err.message);
  }

  // 25. Valid NULL unconfirmed prices and durations remain accepted
  try {
    let accepted = false;
    try {
      await dispClient.execute(`
        INSERT INTO offers (
          id, slug, title_ar, title_en, subtitle_ar, subtitle_en,
          description_ar, description_en, includes_ar, includes_en,
          created_at, updated_at, price_amount_halalas, price_is_confirmed,
          duration_minutes, duration_is_confirmed
        ) VALUES (
          'chk-off-valid-unconf', 'chk-off-valid-unconf', 'عرض', 'Offer', 'عنوان', 'Sub',
          'وصف', 'Desc', '[]', '[]', 1, 1, NULL, 0, NULL, 0
        );
      `);
      accepted = true;
    } catch {
      accepted = false;
    }
    record(
      25,
      'Valid NULL unconfirmed prices and durations remain accepted',
      accepted,
      accepted
        ? 'SQLite cleanly accepted price_amount_halalas = NULL and duration_minutes = NULL when unconfirmed'
        : 'ERROR: Valid NULL unconfirmed record was rejected!'
    );
  } catch (err: any) {
    record(25, 'Valid NULL unconfirmed prices and durations remain accepted', false, err.message);
  }

  // Safely close client connection before removing files
  if (dispClient) {
    await dispClient.close();
  }

  // Remove temporary database, WAL, and SHM files safely
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${disposableDbPath}${ext}`;
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }

  console.log('\n--- PART 3: DEVELOPMENT DATABASE PRESERVATION AUDIT ---');

  // 26. Real development database is not modified by test suite
  try {
    const finalDevCounts = {
      services: Number((await client.execute('SELECT COUNT(*) as c FROM services;')).rows[0].c),
      settings: Number((await client.execute('SELECT COUNT(*) as c FROM site_settings;')).rows[0].c),
      media: Number((await client.execute('SELECT COUNT(*) as c FROM media_files;')).rows[0].c),
      roles: Number((await client.execute('SELECT COUNT(*) as c FROM admin_roles;')).rows[0].c),
      categories: Number((await client.execute('SELECT COUNT(*) as c FROM service_categories;')).rows[0].c),
    };

    const countsMatch =
      initialDevCounts.services === finalDevCounts.services &&
      initialDevCounts.settings === finalDevCounts.settings &&
      initialDevCounts.media === finalDevCounts.media &&
      initialDevCounts.roles === finalDevCounts.roles &&
      initialDevCounts.categories === finalDevCounts.categories;

    const waRaw = (await client.execute("SELECT value_raw FROM site_settings WHERE key = 'contact.whatsapp';")).rows[0]?.value_raw;
    const waIntact = waRaw === '966553543192';

    const passed = countsMatch && waIntact;

    record(
      26,
      'Real development database was NOT modified by test suite',
      passed,
      passed
        ? `data/alor_spa.db row counts exactly preserved (services: ${finalDevCounts.services}, settings: ${finalDevCounts.settings}, WhatsApp: ${waRaw})`
        : `Mismatch detected! initial: ${JSON.stringify(initialDevCounts)}, final: ${JSON.stringify(finalDevCounts)}`
    );
  } catch (err: any) {
    record(26, 'Real development database was NOT modified by test suite', false, err.message);
  }

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(` SUMMARY: ${results.filter((r) => r.passed).length} / ${results.length} TESTS PASSED`);
  console.log(` VERDICT: ${allPassed ? 'ALL HARDENED INTEGRITY TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
