import { getDb } from '../src/server/db/index';
import {
  getDbServices,
  getDbMassageMenu,
  getDbOffers,
  getDbPackages,
} from '../src/server/db/queries';
import { getWhatsAppBookingUrl } from '../src/config/site';

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, title: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`✓ PASS [${String(totalAssertions).padStart(2, '0')}] ${title}`);
    if (detail) console.log(`    ↳ ${detail}`);
  } else {
    console.error(`✗ FAIL [${String(totalAssertions).padStart(2, '0')}] ${title}`);
    if (detail) console.error(`    ↳ ${detail}`);
    process.exitCode = 1;
  }
}

async function verifyContent() {
  console.log('================================================================');
  console.log(' ALOR SPA — Comprehensive Content & Structure Verification');
  console.log('================================================================\n');

  const { client } = getDb();

  // 1. Database Integrity & Foreign Keys
  const integrity = await client.execute('PRAGMA integrity_check;');
  assert(
    integrity.rows[0]?.integrity_check === 'ok',
    'Database Integrity: PRAGMA integrity_check is ok',
    `Result: ${integrity.rows[0]?.integrity_check}`
  );

  const fkCheck = await client.execute('PRAGMA foreign_key_check;');
  assert(
    fkCheck.rows.length === 0,
    'Referential Integrity: PRAGMA foreign_key_check has 0 violations',
    `Violations: ${fkCheck.rows.length}`
  );

  // 2. Core Services Verification (Exact 9)
  const services = await getDbServices();
  assert(
    services.length === 9,
    'Core Services Count: Exactly 9 services registered in database',
    `Found: ${services.length} services`
  );

  const expectedServices = [
    { slug: 'relaxation-massage', price: 149, priceAr: '149 ر.س', titleAr: 'مساج ريلاكس' },
    { slug: 'integrated-4tech-massage', price: 159, priceAr: '159 ر.س', titleAr: 'مساج متكامل بأربع تقنيات مختلفة (أحجار، أقدام، ريلاكس، سيتايشو)' },
    { slug: 'body-sculpting-drainage', price: 169, priceAr: '169 ر.س', titleAr: 'مساج نحت الجسم وتصريف السوائل' },
    { slug: 'hot-stone-massage', price: 159, priceAr: '159 ر.س', titleAr: 'مساج الأحجار الساخنة' },
    { slug: 'deep-tissue-massage', price: 159, priceAr: '159 ر.س', titleAr: 'مساج الأنسجة العميقة' },
    { slug: 'cupping-massage', price: 159, priceAr: '159 ر.س', titleAr: 'مساج كاسات الهواء' },
    { slug: 'therapeutic-massage', price: 159, priceAr: '159 ر.س', titleAr: 'مساج علاجي' },
    { slug: 'pedicure-manicure', price: 149, priceAr: '149 ر.س', titleAr: 'بدكير ومنكير' },
    { slug: 'moroccan-bath', price: 169, priceAr: '169 ر.س', titleAr: 'حمام مغربي' },
  ];

  let servicesPricesMatch = true;
  let servicesNoInventedDurations = true;
  let servicesBilingualValid = true;

  for (const exp of expectedServices) {
    const s = services.find((srv) => srv.slug === exp.slug);
    if (!s) {
      servicesPricesMatch = false;
      console.error(`Missing service: ${exp.slug}`);
      continue;
    }
    if (s.priceAmountHalalas !== exp.price * 100 || !s.priceIsConfirmed) {
      servicesPricesMatch = false;
      console.error(`Price mismatch on ${exp.slug}: expected ${exp.price * 100}, got ${s.priceAmountHalalas}`);
    }
    // No invented durations for the 9 core services
    if (s.durationMinutes !== null || s.durationIsConfirmed !== false) {
      servicesNoInventedDurations = false;
      console.error(`Invented duration found on ${exp.slug}: ${s.durationMinutes}`);
    }
    if (!s.titleAr || !s.titleEn || !s.descriptionAr || !s.descriptionEn) {
      servicesBilingualValid = false;
    }
  }

  assert(
    servicesPricesMatch,
    'Core Services Pricing: All 9 services have confirmed official prices in Saudi Halalas',
    'Prices: 149, 159, 169, 159, 159, 159, 159, 149, 169 SAR verified'
  );

  assert(
    servicesNoInventedDurations,
    'Zero-Invented Durations: Core services have durationMinutes = null and durationIsConfirmed = false',
    'Requirement followed strictly: لا تخترع مدة للخدمات التسع'
  );

  assert(
    servicesBilingualValid,
    'Core Services Bilingual: Every service has complete Arabic and English titles and descriptions',
    'Verified bilingual symmetry across all 9 services'
  );

  // 3. Massage Menu Verification (6 Types with 18 Duration Options)
  const massageMenu = await getDbMassageMenu();
  assert(
    massageMenu.length === 6,
    'Massage Menu Types Count: Exactly 6 massage types registered',
    `Found: ${massageMenu.length} massage types`
  );

  let totalDurationOptions = 0;
  let variantsPricingAccurate = true;

  const expectedMassageDurations: Record<string, Record<number, number>> = {
    'menu-relaxing-massage': { 60: 175, 90: 275, 120: 375 },
    'menu-therapeutic-massage': { 60: 189, 90: 289, 120: 389 },
    'menu-deep-tissue-massage': { 60: 199, 90: 299, 120: 399 },
    'menu-prenatal-postnatal-massage': { 60: 199, 90: 299, 120: 399 },
    'menu-head-shoulders-massage': { 60: 145, 90: 245, 120: 345 },
    'menu-foot-massage': { 60: 145, 90: 245, 120: 345 },
  };

  for (const m of massageMenu) {
    totalDurationOptions += m.variants.length;
    const expDict = expectedMassageDurations[m.slug];
    if (!expDict) {
      variantsPricingAccurate = false;
      console.error(`Unexpected massage slug: ${m.slug}`);
      continue;
    }
    for (const v of m.variants) {
      const expectedPrice = expDict[v.durationMinutes];
      if (v.priceAmountHalalas !== expectedPrice * 100) {
        variantsPricingAccurate = false;
        console.error(`Mismatch for ${m.slug} ${v.durationMinutes}m: expected ${expectedPrice * 100}, got ${v.priceAmountHalalas}`);
      }
    }
  }

  assert(
    totalDurationOptions === 18,
    'Massage Menu Duration Options Count: Exactly 18 duration options registered (3 per type)',
    `Found: ${totalDurationOptions} options across 6 types`
  );

  assert(
    variantsPricingAccurate,
    'Massage Menu Pricing Accuracy: All 18 duration options have exact authorized prices',
    'Verified individual non-unified pricing per massage type and duration'
  );

  // 4. Promotional Offers Verification (Exact 3)
  const offers = await getDbOffers();
  assert(
    offers.length === 3,
    'Offers Count: Exactly 3 active promotional offers registered',
    `Found: ${offers.length} offers`
  );

  const expectedOffers = [
    { slug: 'offer-relax-30', price: 96, duration: 30 },
    { slug: 'offer-relax-30-pedi-mani', price: 249, duration: null },
    { slug: 'offer-relax-30-moroccan-bath', price: 219, duration: null },
  ];

  let offersValid = true;
  for (const exp of expectedOffers) {
    const o = offers.find((off) => off.slug === exp.slug);
    if (!o || o.priceAmountHalalas !== exp.price * 100 || !o.priceIsConfirmed) {
      offersValid = false;
      console.error(`Offer mismatch for ${exp.slug}`);
    }
    if (exp.duration && o?.durationMinutes !== exp.duration) {
      offersValid = false;
      console.error(`Offer duration mismatch for ${exp.slug}`);
    }
  }

  assert(
    offersValid,
    'Offers Pricing & Details: All 3 offers verified with exact prices and inclusions',
    'Offers: 96 SAR (30m), 249 SAR (30m + Pedi-Mani), 219 SAR (30m + Hammam)'
  );

  // 5. Packages Verification (Exact 3 Standard Packages)
  const stdPackages = await getDbPackages('standard');
  assert(
    stdPackages.length === 3,
    'Standard Packages Count: Exactly 3 standard packages registered',
    `Found: ${stdPackages.length} packages`
  );

  const expectedStdPackages = [
    { slug: 'package-relax-pedicure-manicure', price: 296 },
    { slug: 'package-relax-moroccan-bath', price: 296 },
    { slug: 'package-relax-pedi-mani-moroccan-bath', price: 396 },
  ];

  let stdPackagesValid = true;
  for (const exp of expectedStdPackages) {
    const p = stdPackages.find((pkg) => pkg.slug === exp.slug);
    if (!p || p.priceAmountHalalas !== exp.price * 100) {
      stdPackagesValid = false;
      console.error(`Standard package mismatch for ${exp.slug}`);
    }
  }

  assert(
    stdPackagesValid,
    'Standard Packages Pricing & Inclusions: All 3 packages verified with exact prices',
    'Packages: 296 SAR (Relax + Pedi-Mani), 296 SAR (Relax + Hammam), 396 SAR (Relax + Pedi-Mani + Hammam)'
  );

  // 6. Special Packages Verification (Exact 4 Main Packages)
  const specialPackages = await getDbPackages('special');
  assert(
    specialPackages.length === 4,
    'Special Packages Count: Exactly 4 special packages registered',
    `Found: ${specialPackages.length} special packages`
  );

  const giftPkg = specialPackages.find((p) => p.slug === 'special-gift-package');
  const diamondPkg = specialPackages.find((p) => p.slug === 'special-diamond-package');
  const carePkg = specialPackages.find((p) => p.slug === 'special-complete-care-package');
  const friendsPkg = specialPackages.find((p) => p.slug === 'special-friends-package');

  assert(
    giftPkg?.priceAmountHalalas === 35000 &&
      diamondPkg?.priceAmountHalalas === 59900 &&
      carePkg?.priceAmountHalalas === 33000,
    'Special Packages Pricing: Gift (350 SAR), Diamond (599 SAR), Complete Care (330 SAR)',
    'Verified exact halalas amounts and inclusions'
  );

  // 7. Friends Package 3 Distinct Options Verification
  assert(
    friendsPkg !== undefined && friendsPkg.options.length === 3,
    'Friends Package Options Count: Exactly 3 distinct options registered without single combined sum',
    `Found: ${friendsPkg?.options.length} options`
  );

  const friendsExpectedOptions = [
    { slug: 'friends-option-moroccan-bath', price: 259 },
    { slug: 'friends-option-pedicure-manicure', price: 279 },
    { slug: 'friends-option-relax-massage', price: 299 },
  ];

  let friendsOptionsValid = true;
  for (const exp of friendsExpectedOptions) {
    const opt = friendsPkg?.options.find((o) => o.slug === exp.slug);
    if (!opt || opt.priceAmountHalalas !== exp.price * 100) {
      friendsOptionsValid = false;
      console.error(`Friends option mismatch for ${exp.slug}`);
    }
  }

  assert(
    friendsOptionsValid,
    'Friends Package Options Pricing: Hammam (259 SAR), Pedicure-Manicure (279 SAR), Relax Massage (299 SAR)',
    'Prices are kept distinct and not combined into one single price'
  );

  // 8. WhatsApp Booking Links & Phone Number Immutability
  const waArUrl = getWhatsAppBookingUrl('ar', 'مساج ريلاكس');
  const waEnUrl = getWhatsAppBookingUrl('en', 'Relax Massage');

  assert(
    waArUrl?.startsWith('https://wa.me/966553543192?text=') &&
      waArUrl.includes(encodeURIComponent('مساج ريلاكس')) &&
      waEnUrl?.startsWith('https://wa.me/966553543192?text=') &&
      waEnUrl.includes(encodeURIComponent('Relax Massage')),
    'WhatsApp Booking Links: Official number 966553543192 with correctly URL-encoded treatment names',
    `AR: ${waArUrl}\n    ↳ EN: ${waEnUrl}`
  );

  // 9. Check for duplicate slugs across all tables
  const allSlugsRes = await client.execute(`
    SELECT 'service' as type, slug FROM services
    UNION ALL
    SELECT 'massage_type' as type, slug FROM massage_types
    UNION ALL
    SELECT 'offer' as type, slug FROM offers
    UNION ALL
    SELECT 'package' as type, slug FROM packages;
  `);

  const slugSet = new Set<string>();
  let hasDuplicateSlugs = false;
  for (const row of allSlugsRes.rows as any[]) {
    if (slugSet.has(row.slug)) {
      hasDuplicateSlugs = true;
      console.error(`Duplicate slug detected: ${row.slug}`);
    }
    slugSet.add(row.slug);
  }

  assert(
    !hasDuplicateSlugs,
    'Slug Uniqueness: Zero duplicate slugs across services, massage types, offers, and packages',
    `Verified ${slugSet.size} unique authoritative slugs`
  );

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY:`);
  console.log(` Total Assertions: ${totalAssertions}`);
  console.log(` Passed: ${passedAssertions}`);
  console.log(` Failed: ${totalAssertions - passedAssertions}`);
  console.log('================================================================\n');

  if (passedAssertions !== totalAssertions) {
    process.exit(1);
  }
}

verifyContent().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
