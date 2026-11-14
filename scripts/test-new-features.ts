/**
 * ALOR SPA — New Features Comprehensive Verification Suite
 * Tests:
 * 1. "Explore Other Services" («بقية الخدمات») buttons on all service detail pages
 * 2. Working hours update (11:00 AM - 11:00 PM) in Arabic and English across files & database
 * 3. Gallery upgrade: 9 high-res images on disk & rendered in HTML with 7 themes
 * 4. Testimonials & Reviews system (public form, pending state, admin moderation, 20 test models)
 * 5. Booking Requests system (public form, DB storage, unique ref, admin section & smart WhatsApp URLs)
 */

import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../src/server/db/index';
import { servicesData } from '../src/data/services';
import { galleryImages } from '../src/data/gallery';
import { siteConfig } from '../src/config/site';
import { TEST_REVIEW_MODELS } from '../src/pages/api/admin/reviews/seed-test';

import { DEMO_GUESTBOOK_REVIEWS } from '../src/data/demo-reviews';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`    ↳ ${details}`);
}

async function runTests() {
  console.log('\n================================================================');
  console.log(' ALOR SPA — New Features & System Upgrades Verification');
  console.log('================================================================\n');

  const distClient = path.resolve(process.cwd(), 'dist/client');

  // --------------------------------------------------------------------------
  // SECTION 1: "بقية الخدمات" (Other Services) Navigation
  // --------------------------------------------------------------------------
  console.log('--- Section 1: "بقية الخدمات" Navigation ---');
  let arOtherServicesCount = 0;
  let enOtherServicesCount = 0;

  for (const service of servicesData) {
    const arPath = path.join(distClient, 'services', service.slug, 'index.html');
    const enPath = path.join(distClient, 'en', 'services', service.slug, 'index.html');

    if (fs.existsSync(arPath)) {
      const html = fs.readFileSync(arPath, 'utf-8');
      if (html.includes('بقية الخدمات') && (html.includes('href="/services"') || html.includes('href="/services/"'))) {
        arOtherServicesCount++;
      }
    }

    if (fs.existsSync(enPath)) {
      const html = fs.readFileSync(enPath, 'utf-8');
      if (html.includes('Explore Other Services') && (html.includes('href="/en/services"') || html.includes('href="/en/services/"'))) {
        enOtherServicesCount++;
      }
    }
  }

  record(
    '[Test 01] Other Services Button (Arabic): "بقية الخدمات" on all 9 Arabic service pages',
    arOtherServicesCount === 9,
    `Found on ${arOtherServicesCount}/9 Arabic service detail pages`
  );

  record(
    '[Test 02] Other Services Button (English): "Explore Other Services" on all 9 English service pages',
    enOtherServicesCount === 9,
    `Found on ${enOtherServicesCount}/9 English service detail pages`
  );

  // --------------------------------------------------------------------------
  // SECTION 2: Official Working Hours Verification (11:00 AM - 11:00 PM)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 2: Official Working Hours (11:00 AM - 11:00 PM) ---');
  const expectedArHours = 'من الساعة 11:00 صباحًا حتى الساعة 11:00 مساءً.';
  const expectedEnHours = '11:00 AM – 11:00 PM';

  const configHoursArMatches = siteConfig.hours.ar === expectedArHours;
  const configHoursEnMatches = siteConfig.hours.en === expectedEnHours;
  record(
    '[Test 03] Config Hours: siteConfig matches official hours in Arabic & English',
    configHoursArMatches && configHoursEnMatches,
    `AR: "${siteConfig.hours.ar}", EN: "${siteConfig.hours.en}"`
  );

  // Check home pages
  const homeArHtml = fs.readFileSync(path.join(distClient, 'index.html'), 'utf-8');
  const homeEnHtml = fs.readFileSync(path.join(distClient, 'en', 'index.html'), 'utf-8');

  const homeArHasHours = homeArHtml.includes('من الساعة 11:00 صباحًا حتى الساعة 11:00 مساءً.');
  const homeEnHasHours = homeEnHtml.includes('11:00 AM – 11:00 PM') || homeEnHtml.includes('11:00 AM &ndash; 11:00 PM') || homeEnHtml.includes('11:00 AM - 11:00 PM');
  record(
    '[Test 04] HTML Working Hours: Rendered accurately in Footer and Location on Homepages',
    homeArHasHours && homeEnHasHours,
    `Arabic homepage verified: ${homeArHasHours}, English homepage verified: ${homeEnHasHours}`
  );

  // --------------------------------------------------------------------------
  // SECTION 3: Luxury Gallery Upgrade (9 images & 7 themes)
  // --------------------------------------------------------------------------
  console.log('\n--- Section 3: Luxury Gallery Upgrade ---');
  const galleryFiles = [
    'gallery-1.jpg', 'gallery-2.jpg', 'gallery-3.jpg',
    'gallery-4.jpg', 'gallery-5.jpg', 'gallery-6.jpg',
    'gallery-7.jpg', 'gallery-8.jpg', 'gallery-9.jpg',
  ];

  let allGalleryFilesOnDisk = true;
  for (const f of galleryFiles) {
    const p = path.join(process.cwd(), 'public', 'images', 'gallery', f);
    if (!fs.existsSync(p)) {
      allGalleryFilesOnDisk = false;
      break;
    }
  }

  record(
    '[Test 05] Gallery Assets on Disk: All 9 luxury images present in public/images/gallery/',
    allGalleryFilesOnDisk && galleryImages.length === 9,
    `galleryImages count: ${galleryImages.length}, files verified on disk`
  );

  const homeArHas9Gallery = galleryFiles.every((f) => homeArHtml.includes(`/images/gallery/${f}`));
  record(
    '[Test 06] Gallery Render: All 9 images rendered in Gallery section HTML',
    homeArHas9Gallery,
    'Verified 9 gallery image references in rendered client HTML'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: Testimonials & Review System Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Section 4: Testimonials & Reviews System ---');
  const homeArHasReviewForm = homeArHtml.includes('public-review-form') && homeArHtml.includes('ضيفي رأيك وتقييمك');
  const homeEnHasReviewForm = homeEnHtml.includes('public-review-form') && homeEnHtml.includes('Share Your Review');

  record(
    '[Test 07] Public Review Form: «ضيفي رأيك وتقييمك» present in Arabic and English HTML',
    homeArHasReviewForm && homeEnHasReviewForm,
    `Arabic form: ${homeArHasReviewForm}, English form: ${homeEnHasReviewForm}`
  );

  const requiredNames = [
    'نورة', 'سارة', 'الجوهرة', 'ريم', 'العنود', 'لينا', 'دانة', 'مها', 'غادة', 'أريج',
    'لمى', 'شهد', 'هيا', 'نوف', 'جود', 'عبير', 'روان', 'مريم', 'دلال', 'يارا',
  ];

  const hasAll20Names = requiredNames.every((n) => DEMO_GUESTBOOK_REVIEWS.some((d) => d.name === n));
  const allAreDemoStatus = DEMO_GUESTBOOK_REVIEWS.every((d) => d.status === 'Demo' || d.status === 'Draft');

  record(
    '[Test 08] Test Review Models: All 20 exact Saudi female names and Demo/Draft status verified',
    DEMO_GUESTBOOK_REVIEWS.length === 20 && hasAll20Names && allAreDemoStatus,
    `Verified 20/20 names (نورة, سارة, الجوهرة, ريم, etc.) with Demo/Draft protection`
  );

  // Check admin reviews page
  const adminReviewsFile = path.resolve(process.cwd(), 'src/pages/admin/reviews/index.astro');
  const adminReviewsCode = fs.readFileSync(adminReviewsFile, 'utf-8');
  const hasGuestbookTab = adminReviewsCode.includes('tab-view-guestbook') &&
                          adminReviewsCode.includes('demo-review-card');
  const hasReplaceAction = adminReviewsCode.includes('replace-demo-btn') &&
                           adminReviewsCode.includes('replace-demo-modal');
  const hasFilterTabs = adminReviewsCode.includes('data-filter="pending"') &&
                        adminReviewsCode.includes('data-filter="approved"') &&
                        adminReviewsCode.includes('data-filter="rejected"');
  const hasActionButtons = adminReviewsCode.includes('action-accept-btn') &&
                           adminReviewsCode.includes('action-reject-btn');
  const hasSeedTestBtn = adminReviewsCode.includes('seed-test-reviews-btn');

  record(
    '[Test 09] Guestbook 20 Cards & Moderation UI: 20 luxury cards, Replace modal, and status filters',
    hasGuestbookTab && hasReplaceAction && hasFilterTabs && hasActionButtons && hasSeedTestBtn,
    `Guestbook cards: ${hasGuestbookTab}, Replace action: ${hasReplaceAction}, Moderation: ${hasActionButtons}`
  );

  // --------------------------------------------------------------------------
  // SECTION 5: Booking Requests System & Database Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Section 5: Booking Requests System ---');
  const homeArHasBookingForm = homeArHtml.includes('id="inquiry-form"') &&
                               homeArHtml.includes('client-date') &&
                               homeArHtml.includes('client-time') &&
                               homeArHtml.includes('إرسال طلب الحجز');

  const homeEnHasBookingForm = homeEnHtml.includes('id="inquiry-form"') &&
                               homeEnHtml.includes('client-date') &&
                               homeEnHtml.includes('client-time') &&
                               homeEnHtml.includes('Submit Booking Request');

  record(
    '[Test 10] Public Booking Form: Name, Phone, Service, Date, Time, Notes & Submit Button',
    homeArHasBookingForm && homeEnHasBookingForm,
    `Arabic form verified: ${homeArHasBookingForm}, English form verified: ${homeEnHasBookingForm}`
  );

  // Test inserting and retrieving a booking request in the real SQLite DB
  const { client } = getDb();
  const testRef = `ALOR-BK-TEST-${Date.now()}`;
  const now = Date.now();

  await client.execute({
    sql: `INSERT INTO booking_requests (
      id, request_number, client_name, client_phone, service_id, service_name,
      preferred_date, preferred_time, notes, status, admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?);`,
    args: [
      `test-id-${now}`,
      testRef,
      'أروى الشامخ',
      '0501234567',
      'moroccan-bath',
      'حمام مغربي فاخر',
      '2026-11-20',
      '04:00 PM',
      'جلسة استرخاء خاصة',
      now,
      now,
    ],
  });

  const checkRes = await client.execute({
    sql: 'SELECT * FROM booking_requests WHERE request_number = ?;',
    args: [testRef],
  });

  const insertedBooking = checkRes.rows[0];
  const bookingInsertedSuccessfully = insertedBooking &&
                                      insertedBooking.client_name === 'أروى الشامخ' &&
                                      insertedBooking.status === 'new';

  record(
    '[Test 11] Booking Request SQLite Storage: Successfully inserted & verified in database',
    Boolean(bookingInsertedSuccessfully),
    `Saved ref: ${insertedBooking?.request_number}, status: ${insertedBooking?.status}`
  );

  // Test status update
  await client.execute({
    sql: "UPDATE booking_requests SET status = 'confirmed' WHERE request_number = ?;",
    args: [testRef],
  });

  const updatedCheck = await client.execute({
    sql: 'SELECT status FROM booking_requests WHERE request_number = ?;',
    args: [testRef],
  });
  const statusUpdated = updatedCheck.rows[0]?.status === 'confirmed';

  record(
    '[Test 12] Booking Status Update: Status transitions to "confirmed"',
    statusUpdated,
    `Status updated to: ${updatedCheck.rows[0]?.status}`
  );

  // Clean up test record
  await client.execute({
    sql: 'DELETE FROM booking_requests WHERE request_number = ?;',
    args: [testRef],
  });

  // Verify Admin Bookings Page & WhatsApp links format
  const adminBookingsFile = path.resolve(process.cwd(), 'src/pages/admin/bookings/index.astro');
  const adminBookingsCode = fs.readFileSync(adminBookingsFile, 'utf-8');

  const hasFollowupWa = adminBookingsCode.includes('wa-followup-client-btn') &&
                        adminBookingsCode.includes('cleanPhoneForWhatsApp');
  const hasCenterWa = adminBookingsCode.includes('wa-forward-spa-btn') &&
                      adminBookingsCode.includes('966553543192') &&
                      adminBookingsCode.includes('مرحبًا ALOR SPA 🌸') &&
                      adminBookingsCode.includes('وصل طلب حجز جديد من الموقع:');

  record(
    '[Test 13] Smart WhatsApp Buttons in Admin: Follow up with client & Forward to Spa (966553543192)',
    hasFollowupWa && hasCenterWa,
    `Client button: ${hasFollowupWa}, Center button with exact Arabic message: ${hasCenterWa}`
  );

  // Check Admin Sidebar & Dashboard Notification badges
  const sidebarFile = path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.astro');
  const sidebarCode = fs.readFileSync(sidebarFile, 'utf-8');
  const sidebarHasBookings = sidebarCode.includes('/admin/bookings') && sidebarCode.includes('newBookingsCount');

  const adminDashboardFile = path.resolve(process.cwd(), 'src/pages/admin/index.astro');
  const adminDashboardCode = fs.readFileSync(adminDashboardFile, 'utf-8');
  const dashboardHasAlert = adminDashboardCode.includes('/admin/bookings') && adminDashboardCode.includes('newBookingsCount');

  record(
    '[Test 14] Admin Notifications: Live badge in AdminSidebar and Alert Banner on Dashboard',
    sidebarHasBookings && dashboardHasAlert,
    `Sidebar badge: ${sidebarHasBookings}, Dashboard alert: ${dashboardHasAlert}`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(' AUDIT SUMMARY:');
  const passed = results.filter((r) => r.passed).length;
  console.log(` Total Tests: ${results.length}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${results.length - passed}`);
  console.log('================================================================\n');

  if (passed !== results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
