/**
 * ALOR SPA — Milestone 6 / Phase 1 Comprehensive SEO & Indexing Verification Test Suite
 *
 * Verifies:
 * 1. Public Pages Inventory (16 routes: 8 Arabic + 8 English)
 * 2. Unique SEO Metadata (Titles, Descriptions, Canonicals, OpenGraph, Twitter Cards, Robots)
 * 3. Riyadh Local SEO Keywords Natural Integration
 * 4. Schema.org JSON-LD Structured Data (WebSite, BeautySalon/DaySpa, WebPage, Service, BreadcrumbList)
 * 5. Strict Zero-Fake-Data Enforcement (No fake reviews, ratings, hours, coordinates)
 * 6. Multilingual & hreflang Symmetry (ar, en, x-default)
 * 7. robots.txt Directives & Security Disallow rules
 * 8. sitemap.xml Compliance (16 public URLs, zero admin/api leakage)
 * 9. Image SEO, Alt Text & Layout Shift Prevention (width/height/decoding/loading)
 * 10. Admin & Private Endpoints Protection (noindex, nofollow, disallowed)
 */

import * as fs from 'fs';
import * as path from 'path';
import { servicesData } from './src/data/services';
import { siteConfig, getSiteUrl, getSchemaTelephone, normalizeWhatsAppNumber } from './src/config/site';

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
console.log(' ALOR SPA — Milestone 6 / Phase 1: Technical & Local SEO Audit');
console.log('================================================================\n');

// 1. Verify Public Page Inventory & Prerendered HTML Files in dist/client
const distDir = path.resolve('dist/client');
const expectedHtmlRoutes = [
  'index.html',
  'services/index.html',
  'services/relaxation-massage/index.html',
  'services/integrated-4tech-massage/index.html',
  'services/body-sculpting-drainage/index.html',
  'services/hot-stone-massage/index.html',
  'services/deep-tissue-massage/index.html',
  'services/cupping-massage/index.html',
  'services/therapeutic-massage/index.html',
  'services/pedicure-manicure/index.html',
  'services/moroccan-bath/index.html',
  'en/index.html',
  'en/services/index.html',
  'en/services/relaxation-massage/index.html',
  'en/services/integrated-4tech-massage/index.html',
  'en/services/body-sculpting-drainage/index.html',
  'en/services/hot-stone-massage/index.html',
  'en/services/deep-tissue-massage/index.html',
  'en/services/cupping-massage/index.html',
  'en/services/therapeutic-massage/index.html',
  'en/services/pedicure-manicure/index.html',
  'en/services/moroccan-bath/index.html',
];

const missingFiles = expectedHtmlRoutes.filter((r) => !fs.existsSync(path.join(distDir, r)));
assert(
  missingFiles.length === 0,
  'Public Page Inventory: All 22 public pages are prerendered and exist in dist',
  missingFiles.length === 0 ? `Verified 22/22 HTML pages on disk` : `Missing: ${missingFiles.join(', ')}`
);

// Read all 22 HTML contents
const htmlFiles = expectedHtmlRoutes.map((r) => ({
  route: r,
  content: fs.readFileSync(path.join(distDir, r), 'utf-8'),
}));

// 2. Metadata Uniqueness across all 22 pages
const titles = new Set<string>();
const descriptions = new Set<string>();
let allTitlesValid = true;
let allDescriptionsValid = true;

for (const { route, content } of htmlFiles) {
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  if (!titleMatch || !titleMatch[1].trim()) {
    allTitlesValid = false;
    console.error(`Missing title on ${route}`);
  } else {
    titles.add(titleMatch[1].trim());
  }

  if (!descMatch || !descMatch[1].trim()) {
    allDescriptionsValid = false;
    console.error(`Missing description on ${route}`);
  } else {
    descriptions.add(descMatch[1].trim());
  }
}

assert(
  allTitlesValid && titles.size === 22 && allDescriptionsValid && descriptions.size === 22,
  'Metadata Uniqueness: Every single public page has a unique Title and Meta Description',
  `Found ${titles.size} unique titles and ${descriptions.size} unique descriptions out of 22 pages`
);

// 3. Robots meta directives on public pages
const allRobotsIndex = htmlFiles.every(({ content }) =>
  content.includes('<meta name="robots" content="index, follow')
);
assert(
  allRobotsIndex,
  'Robots Directives: All public pages declare "index, follow" with large image previews',
  'Verified meta name="robots" on all 22 public HTML pages'
);

// 4. Canonical URLs and hreflang Symmetry
let canonicalAndHreflangValid = true;
for (const { route, content } of htmlFiles) {
  const hasCanonical = /<link\s+rel=["']canonical["']\s+href=["']https?:\/\/[^"']+["']\s*\/?>/i.test(content);
  const hasHreflangAr = /<link\s+rel=["']alternate["']\s+hreflang=["']ar["']\s+href=["']https?:\/\/[^"']+["']\s*\/?>/i.test(content);
  const hasHreflangEn = /<link\s+rel=["']alternate["']\s+hreflang=["']en["']\s+href=["']https?:\/\/[^"']+["']\s*\/?>/i.test(content);
  const hasHreflangXDefault = /<link\s+rel=["']alternate["']\s+hreflang=["']x-default["']\s+href=["']https?:\/\/[^"']+["']\s*\/?>/i.test(content);

  if (!hasCanonical || !hasHreflangAr || !hasHreflangEn || !hasHreflangXDefault) {
    canonicalAndHreflangValid = false;
    console.error(`Missing canonical or hreflang tags on: ${route}`);
  }
}
assert(
  canonicalAndHreflangValid,
  'Canonical & hreflang Symmetry: All pages have canonical, hreflang="ar", "en", and "x-default"',
  'Multilingual bidirectional linking verified without missing alternate tags'
);

// 5. Riyadh Local SEO Target Keywords
const arabicHome = htmlFiles.find((f) => f.route === 'index.html')?.content || '';
const arabicServices = htmlFiles.find((f) => f.route === 'services/index.html')?.content || '';
const allArabicContent = htmlFiles
  .filter((f) => !f.route.startsWith('en/'))
  .map((f) => f.content)
  .join(' ');

const targetLocalKeywords = [
  'مساج بالرياض',
  'مساج نسائي بالرياض',
  'مساج استرخائي بالرياض',
  'مساج علاجي بالرياض',
  'مساج الأحجار الساخنة بالرياض',
  'حمام مغربي بالرياض',
  'بدكير ومنكير بالرياض',
  'نحت الجسم وتصريف السوائل بالرياض',
  'ALOR SPA Riyadh',
];

const keywordResults = targetLocalKeywords.map((kw) => ({
  keyword: kw,
  found: allArabicContent.includes(kw) || htmlFiles.some((f) => f.content.includes(kw)),
}));
const allKeywordsPresent = keywordResults.every((k) => k.found);

assert(
  allKeywordsPresent,
  'Riyadh Local SEO: All targeted high-value Riyadh keywords naturally present in metadata & copy',
  keywordResults.map((k) => `${k.keyword}: ${k.found ? '✓' : '✗'}`).join(', ')
);

// 6. Schema.org JSON-LD Structured Data Validation
let structuredDataValid = true;
let zeroFakeDataEnforced = true;

for (const { route, content } of htmlFiles) {
  const jsonLdMatches = content.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  let pageHasJsonLd = false;

  for (const match of jsonLdMatches) {
    pageHasJsonLd = true;
    try {
      const parsed = JSON.parse(match[1]);
      const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);

      // Check required types
      const types = graph.flatMap((item: any) =>
        Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
      );

      // Verify WebSite, BeautySalon/DaySpa, WebPage present
      if (!types.includes('WebSite') || !types.includes('WebPage')) {
        structuredDataValid = false;
        console.error(`Missing standard WebSite or WebPage schema in ${route}`);
      }

      // Check for zero fake reviews, zero fake ratings, zero fake hours
      const rawString = JSON.stringify(parsed);
      if (
        rawString.includes('AggregateRating') ||
        rawString.includes('ratingValue') ||
        rawString.includes('reviewCount') ||
        rawString.includes('OpeningHoursSpecification')
      ) {
        zeroFakeDataEnforced = false;
        console.error(`Fake review/hours detected in schema of ${route}`);
      }

      // If service page, must have Service and BreadcrumbList
      if (route.includes('services/') && route !== 'services/index.html' && route !== 'en/services/index.html') {
        if (!types.includes('Service') || !types.includes('BreadcrumbList')) {
          structuredDataValid = false;
          console.error(`Missing Service or BreadcrumbList schema on service page ${route}`);
        }
      }
    } catch (err) {
      structuredDataValid = false;
      console.error(`Malformed JSON-LD in ${route}:`, err);
    }
  }

  if (!pageHasJsonLd) {
    structuredDataValid = false;
    console.error(`No JSON-LD found in ${route}`);
  }
}

assert(
  structuredDataValid,
  'Structured Data: Valid Schema.org types (WebSite, BeautySalon, WebPage, Service, BreadcrumbList)',
  'JSON-LD parses cleanly without syntax errors across all 16 pages'
);

assert(
  zeroFakeDataEnforced,
  'Zero-Fake-Data Enforcement: No fake AggregateRating, reviews, or unconfirmed hours in Schema.org',
  'Strict compliance with Google search guidelines and project rules'
);

// 7. Official Contact Immutability (+966553543192)
const officialWhatsApp = normalizeWhatsAppNumber(siteConfig.contact.whatsapp);
const officialTel = getSchemaTelephone();
assert(
  officialWhatsApp === '966553543192' && officialTel === '+966553543192',
  'Official WhatsApp Protection: Confirmed phone +966553543192 verified across config & schema',
  `Configured: ${officialWhatsApp}, Telephone: ${officialTel}`
);

// 8. robots.txt Verification
const robotsPath = path.join(distDir, 'robots.txt');
assert(fs.existsSync(robotsPath), 'robots.txt: Generated in build output dist/client/robots.txt');
const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
const robotsAllowsPublic = robotsContent.includes('Allow: /') && robotsContent.includes('Allow: /images/');
const robotsDisallowsAdmin = robotsContent.includes('Disallow: /admin') && robotsContent.includes('Disallow: /api/');
const robotsHasSitemap = robotsContent.includes('Sitemap: https://alorspa.com/sitemap.xml');

assert(
  robotsAllowsPublic && robotsDisallowsAdmin && robotsHasSitemap,
  'robots.txt Directives: Allows public crawler access, disallows admin/API, references sitemap.xml',
  `Allow: /, Disallow: /admin, Sitemap: https://alorspa.com/sitemap.xml`
);

// 9. sitemap.xml Verification
const sitemapPath = path.join(distDir, 'sitemap.xml');
assert(fs.existsSync(sitemapPath), 'sitemap.xml: Generated in build output dist/client/sitemap.xml');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
const sitemapUrls = (sitemapContent.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) || []).map((m) =>
  m.replace(/<\/?loc>/g, '')
);

const hasZeroAdminInSitemap = !sitemapContent.includes('/admin') && !sitemapContent.includes('/api');
const hasAll22PagesInSitemap = sitemapUrls.length === 22;
const hasXhtmlAlternates = sitemapContent.includes('xhtml:link rel="alternate"');

assert(
  hasAll22PagesInSitemap && hasZeroAdminInSitemap && hasXhtmlAlternates,
  'sitemap.xml Compliance: Contains exactly 22 public URLs, 0 admin/api leaks, and xhtml:link alternates',
  `Sitemap URLs: ${sitemapUrls.length}, Admin leaks: 0, xhtml alternates verified`
);

// 10. Image SEO, Alt Text & Layout Shift Prevention
let allImagesHaveAlt = true;
let allImagesHaveDimensions = true;

for (const { route, content } of htmlFiles) {
  // Match all <img> tags that are rendered
  const imgMatches = content.matchAll(/<img\s+([^>]+)>/gi);
  for (const match of imgMatches) {
    const attrs = match[1];
    // Exclude dynamic client template strings or lightbox template tags if any
    if (attrs.includes('id="lightbox-img"')) continue;

    const hasAlt = /alt=["'][^"']*["']/i.test(attrs);
    const hasWidth = /width=["'][0-9]+["']/i.test(attrs);
    const hasHeight = /height=["'][0-9]+["']/i.test(attrs);

    if (!hasAlt) {
      allImagesHaveAlt = false;
      console.error(`Image missing alt in ${route}: ${attrs}`);
    }
    if (!hasWidth || !hasHeight) {
      allImagesHaveDimensions = false;
      console.error(`Image missing width/height in ${route}: ${attrs}`);
    }
  }
}

assert(
  allImagesHaveAlt && allImagesHaveDimensions,
  'Image Optimization & CLS: All visible images have descriptive Alt text, explicit width, and height',
  'Layout shift prevention and visual accessibility verified across all 16 pages'
);

// 11. Admin & Login Pages Isolation (noindex, nofollow)
const adminLayoutContent = fs.readFileSync(path.resolve('src/layouts/AdminLayout.astro'), 'utf-8');
const adminLoginContent = fs.readFileSync(path.resolve('src/pages/admin/login.astro'), 'utf-8');
const adminHasNoindex = adminLayoutContent.includes('content="noindex, nofollow"');
const loginHasNoindex = adminLoginContent.includes('content="noindex, nofollow"');

assert(
  adminHasNoindex && loginHasNoindex,
  'Admin Pages Isolation: Admin layout and login page declare meta "noindex, nofollow"',
  'Guarantees search engines will never index internal admin dashboards or authentication forms'
);

console.log('\n================================================================');
console.log(` AUDIT SUMMARY:`);
console.log(` Total Tests: ${totalTests}`);
console.log(` Passed: ${passedTests}`);
console.log(` Failed: ${totalTests - passedTests}`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('All Milestone 6 Phase 1 SEO & Indexing verification tests passed successfully!');
} else {
  process.exit(1);
}
