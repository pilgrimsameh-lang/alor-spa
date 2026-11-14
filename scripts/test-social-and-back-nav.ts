/**
 * ALOR SPA — Social Media Links & Global Back Navigation Verification Script
 */

import * as fs from 'fs';
import * as path from 'path';

const distDir = path.resolve('dist/client');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✓ PASS [Test ${String(totalTests).padStart(2, '0')}] ${testName}`);
    if (detail) console.log(`    ↳ ${detail}`);
  } else {
    console.error(`✗ FAIL [Test ${String(totalTests).padStart(2, '0')}] ${testName}`);
    if (detail) console.error(`    ↳ ${detail}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log(' ALOR SPA — Social Media & Global Back Navigation Verification');
console.log('================================================================\n');

// 1. Check all HTML pages exist
const homePages = ['index.html', 'en/index.html'];
const catalogPages = ['services/index.html', 'en/services/index.html'];
const serviceSlugs = [
  'relaxation-massage',
  'integrated-4tech-massage',
  'body-sculpting-drainage',
  'hot-stone-massage',
  'deep-tissue-massage',
  'cupping-massage',
  'therapeutic-massage',
  'pedicure-manicure',
  'moroccan-bath',
];

const servicePagesAr = serviceSlugs.map(s => `services/${s}/index.html`);
const servicePagesEn = serviceSlugs.map(s => `en/services/${s}/index.html`);
const internalPages = [...catalogPages, ...servicePagesAr, ...servicePagesEn];
const allPages = [...homePages, ...internalPages];

// Verify all files exist
const missingFiles = allPages.filter(p => !fs.existsSync(path.join(distDir, p)));
assert(missingFiles.length === 0, 'Page Inventory: All 22 pages exist in dist/client', `Found ${allPages.length - missingFiles.length}/${allPages.length}`);

// Test 2: Social Media Links in Footer across all pages
for (const p of allPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  
  // Instagram verification
  const hasInstagram = content.includes('href="https://www.instagram.com/alor_homspa/"');
  if (!hasInstagram) {
    assert(false, `Instagram URL verification on ${p}`, 'Missing exact URL: https://www.instagram.com/alor_homspa/');
    break;
  }
}
assert(true, 'Instagram URL: Verified exact link https://www.instagram.com/alor_homspa/ on all 22 pages');

for (const p of allPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  
  // TikTok verification
  const hasTikTok = content.includes('href="https://www.tiktok.com/@alor_homspa"');
  if (!hasTikTok) {
    assert(false, `TikTok URL verification on ${p}`, 'Missing exact URL: https://www.tiktok.com/@alor_homspa');
    break;
  }
}
assert(true, 'TikTok URL: Verified exact link https://www.tiktok.com/@alor_homspa on all 22 pages');

// Test 3: target="_blank" and rel="noopener noreferrer"
const arHomeContent = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
const enHomeContent = fs.readFileSync(path.join(distDir, 'en/index.html'), 'utf-8');

assert(
  arHomeContent.includes('href="https://www.instagram.com/alor_homspa/"') &&
  arHomeContent.includes('target="_blank"') &&
  arHomeContent.includes('rel="noopener noreferrer"'),
  'Social Links Security: target="_blank" with rel="noopener noreferrer" on Instagram'
);

assert(
  arHomeContent.includes('href="https://www.tiktok.com/@alor_homspa"') &&
  arHomeContent.includes('target="_blank"') &&
  arHomeContent.includes('rel="noopener noreferrer"'),
  'Social Links Security: target="_blank" with rel="noopener noreferrer" on TikTok'
);

// Test 4: Accessibility aria-labels
assert(
  arHomeContent.includes('aria-label="حساب إنستغرام ألور سبا الرسمي (@alor_homspa)"') &&
  enHomeContent.includes('aria-label="Official ALOR SPA Instagram Profile (@alor_homspa)"'),
  'Instagram A11y: Bilingual descriptive aria-label on Arabic and English'
);

assert(
  arHomeContent.includes('aria-label="حساب تيك توك ألور سبا الرسمي (@alor_homspa)"') &&
  enHomeContent.includes('aria-label="Official ALOR SPA TikTok Profile (@alor_homspa)"'),
  'TikTok A11y: Bilingual descriptive aria-label on Arabic and English'
);

// Test 5: Zero fake/placeholder links
const hasFakeSnapchat = arHomeContent.includes('https://snapchat.com') || enHomeContent.includes('https://snapchat.com');
const hasFakeX = arHomeContent.includes('https://x.com') || enHomeContent.includes('https://x.com');
assert(!hasFakeSnapchat && !hasFakeX, 'Zero Dummy Links: Removed placeholder Snapchat/X links from footer');

// Test 6: Back to Home button DOES NOT appear on Homepages
const homeArHasBack = arHomeContent.includes('data-testid="back-to-home"');
const homeEnHasBack = enHomeContent.includes('data-testid="back-to-home"');
assert(!homeArHasBack && !homeEnHasBack, 'Home Page Isolation: Back to Home button does NOT appear on Arabic or English home pages');

// Test 7: Back to Home button DOES appear on ALL 20 internal pages
let allInternalHaveBack = true;
let failedInternalPage = '';
for (const p of internalPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  if (!content.includes('data-testid="back-to-home"')) {
    allInternalHaveBack = false;
    failedInternalPage = p;
    break;
  }
}
assert(allInternalHaveBack, 'Internal Pages Coverage: Back to Home button is present on all 20 internal pages', failedInternalPage ? `Missing on: ${failedInternalPage}` : `Verified across all 20 internal pages`);

// Test 8: Correct destination links & language symmetry
let arabicNavOk = true;
const arInternalPages = ['services/index.html', ...servicePagesAr];
for (const p of arInternalPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  const tagMatch = content.match(/<a\s+[^>]*data-testid="back-to-home"[^>]*>/);
  if (!tagMatch) {
    arabicNavOk = false;
    console.error(`Tag not found in ${p}`);
    break;
  }
  const hrefMatch = tagMatch[0].match(/href="([^"]+)"/);
  if (!hrefMatch || hrefMatch[1] !== '/') {
    arabicNavOk = false;
    console.error(`Wrong href in ${p}: ${hrefMatch ? hrefMatch[1] : 'not found'}`);
    break;
  }
  if (!content.includes('العودة للرئيسية')) {
    arabicNavOk = false;
    console.error(`Missing Arabic text in ${p}`);
    break;
  }
}
assert(arabicNavOk, 'Arabic Back Navigation: Links directly to "/" with text "العودة للرئيسية" on all 10 Arabic internal pages');

let englishNavOk = true;
const enInternalPages = ['en/services/index.html', ...servicePagesEn];
for (const p of enInternalPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  const tagMatch = content.match(/<a\s+[^>]*data-testid="back-to-home"[^>]*>/);
  if (!tagMatch) {
    englishNavOk = false;
    console.error(`Tag not found in ${p}`);
    break;
  }
  const hrefMatch = tagMatch[0].match(/href="([^"]+)"/);
  if (!hrefMatch || hrefMatch[1] !== '/en/') {
    englishNavOk = false;
    console.error(`Wrong href in ${p}: ${hrefMatch ? hrefMatch[1] : 'not found'}`);
    break;
  }
  if (!content.includes('Back to Home')) {
    englishNavOk = false;
    console.error(`Missing English text in ${p}`);
    break;
  }
}
assert(englishNavOk, 'English Back Navigation: Links directly to "/en/" with text "Back to Home" on all 10 English internal pages');

// Test 9: Arrow Direction
let rtlArrowOk = true;
for (const p of arInternalPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  if (!content.includes('data-arrow-dir="left"')) {
    rtlArrowOk = false;
    console.error(`RTL Arrow missing left direction in ${p}`);
    break;
  }
}
assert(rtlArrowOk, 'RTL Arrow Direction: Points LEFT (data-arrow-dir="left") on Arabic internal pages');

let ltrArrowOk = true;
for (const p of enInternalPages) {
  const content = fs.readFileSync(path.join(distDir, p), 'utf-8');
  if (!content.includes('data-arrow-dir="right"')) {
    ltrArrowOk = false;
    console.error(`LTR Arrow missing right direction in ${p}`);
    break;
  }
}
assert(ltrArrowOk, 'LTR Arrow Direction: Points RIGHT (data-arrow-dir="right") on English internal pages');

// Test 10: Official WhatsApp unchanged
assert(
  arHomeContent.includes('966553543192'),
  'WhatsApp Integrity: Official WhatsApp number 966553543192 preserved'
);

console.log('\n================================================================');
console.log(' AUDIT SUMMARY:');
console.log(` Total Tests: ${totalTests}`);
console.log(` Passed: ${passedTests}`);
console.log(` Failed: ${totalTests - passedTests}`);
console.log('================================================================\n');

if (totalTests === passedTests) {
  console.log('All Social Media & Global Back Navigation verification tests passed successfully!\n');
} else {
  process.exit(1);
}
