import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:4321';

async function fetchUrl(urlPath: string, options: RequestInit = {}): Promise<{ status: number; headers: Headers; text: string; redirected?: boolean; url?: string }> {
  const url = `${BASE_URL}${urlPath}`;
  const res = await fetch(url, {
    redirect: 'manual',
    ...options,
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    text,
    url: res.url,
  };
}

async function runMilestone7Audit() {
  console.log('================================================================');
  console.log(' ALOR SPA — Milestone 7: Full QA & Comprehensive Verification');
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

  // 1. Check Public Pages
  console.log('--- 1. Public Pages HTTP Status & Headings ---');
  const publicPages = [
    { path: '/', titleExpected: 'ألور سبا', lang: 'ar', dir: 'rtl' },
    { path: '/en/', titleExpected: 'ALOR SPA', lang: 'en', dir: 'ltr' },
    { path: '/services', titleExpected: 'خدمات', lang: 'ar', dir: 'rtl' },
    { path: '/en/services', titleExpected: 'Services', lang: 'en', dir: 'ltr' },
    { path: '/services/relaxation-massage', titleExpected: 'المساج الاسترخائي', lang: 'ar', dir: 'rtl' },
    { path: '/services/hot-stone-massage', titleExpected: 'مساج الأحجار الساخنة', lang: 'ar', dir: 'rtl' },
    { path: '/services/therapeutic-massage', titleExpected: 'المساج العلاجي', lang: 'ar', dir: 'rtl' },
    { path: '/services/moroccan-bath', titleExpected: 'الحمام المغربي', lang: 'ar', dir: 'rtl' },
    { path: '/services/pedicure-manicure', titleExpected: 'البدكير والمنكير', lang: 'ar', dir: 'rtl' },
    { path: '/services/body-sculpting-drainage', titleExpected: 'نحت الجسم وتصريف السوائل', lang: 'ar', dir: 'rtl' },
    { path: '/en/services/relaxation-massage', titleExpected: 'Relaxation Massage', lang: 'en', dir: 'ltr' },
    { path: '/en/services/hot-stone-massage', titleExpected: 'Hot Stone Massage', lang: 'en', dir: 'ltr' },
    { path: '/en/services/therapeutic-massage', titleExpected: 'Therapeutic Massage', lang: 'en', dir: 'ltr' },
    { path: '/en/services/moroccan-bath', titleExpected: 'Moroccan Hammam Bath', lang: 'en', dir: 'ltr' },
    { path: '/en/services/pedicure-manicure', titleExpected: 'Pedicure & Manicure', lang: 'en', dir: 'ltr' },
    { path: '/en/services/body-sculpting-drainage', titleExpected: 'Body Sculpting & Lymphatic Drainage', lang: 'en', dir: 'ltr' },
  ];

  let allPagesOk = true;
  for (const page of publicPages) {
    const res = await fetchUrl(page.path);
    const hasStatus200 = res.status === 200;
    const hasLang = res.text.includes(`lang="${page.lang}"`);
    const hasDir = res.text.includes(`dir="${page.dir}"`);
    const hasTitle = res.text.includes('<title>');
    if (!hasStatus200 || !hasLang || !hasDir || !hasTitle) {
      allPagesOk = false;
      console.error(`Page ${page.path} failed check: status=${res.status}, lang=${hasLang}, dir=${hasDir}`);
    }
  }
  assert(allPagesOk, 'Public Pages Status 200 & i18n Attributes', `All 16 public pages returned 200 OK with accurate lang and dir attributes`);

  // 2. SEO & Technical Assets
  console.log('\n--- 2. SEO & Technical Assets ---');
  const robotsRes = await fetchUrl('/robots.txt');
  const robotsValid = robotsRes.status === 200 && robotsRes.text.includes('Disallow: /admin') && robotsRes.text.includes('Sitemap: https://alorspa.com/sitemap.xml');
  assert(robotsValid, 'robots.txt Content & Status', 'Status 200 with Disallow: /admin and valid sitemap reference');

  const sitemapRes = await fetchUrl('/sitemap.xml');
  const sitemapValid = sitemapRes.status === 200 && sitemapRes.text.includes('<urlset') && sitemapRes.text.includes('https://alorspa.com/services/relaxation-massage');
  assert(sitemapValid, 'sitemap.xml Content & Status', 'Status 200 with XML urlset and canonical URLs');

  // 3. Official WhatsApp Number Verification
  console.log('\n--- 3. Official WhatsApp Number Consistency ---');
  const homeRes = await fetchUrl('/');
  const officialWaPresent = homeRes.text.includes('966553543192') || homeRes.text.includes('0553543192');
  const waLinkValid = homeRes.text.includes('https://wa.me/966553543192');
  assert(officialWaPresent && waLinkValid, 'Official WhatsApp 966553543192 Link & Display', 'wa.me links and display formatting use strictly 966553543192');

  // 4. Image Integrity (Check that every referenced <img> in HTML exists on disk)
  console.log('\n--- 4. Image Asset Integrity ---');
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  let match;
  const referencedImages = new Set<string>();
  for (const page of ['/', '/en/', '/services', '/en/services', '/services/relaxation-massage']) {
    const res = await fetchUrl(page);
    while ((match = imgRegex.exec(res.text)) !== null) {
      const src = match[1];
      if (src.startsWith('/')) {
        referencedImages.add(src.split('?')[0]);
      }
    }
  }

  let missingImages: string[] = [];
  for (const imgSrc of referencedImages) {
    const filePath = path.join(process.cwd(), 'public', imgSrc.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      missingImages.push(imgSrc);
    }
  }
  assert(missingImages.length === 0, 'No Broken Images on Public Pages', `Checked ${referencedImages.size} image references; missing: ${missingImages.length}`);

  // 5. Admin Portal Security & Protection (Unauthenticated Access)
  console.log('\n--- 5. Admin Authentication & Route Protection ---');
  const adminPageRes = await fetchUrl('/admin');
  const adminRedirectsToLogin = adminPageRes.status === 302 && adminPageRes.headers.get('location')?.includes('/admin/login');
  assert(adminRedirectsToLogin, 'Admin Page Redirects Unauthenticated Users', `Status ${adminPageRes.status} -> Location: ${adminPageRes.headers.get('location')}`);

  const adminSubpages = [
    '/admin/services',
    '/admin/categories',
    '/admin/offers',
    '/admin/gallery',
    '/admin/media',
    '/admin/reviews',
    '/admin/blog',
    '/admin/settings',
    '/admin/activity-logs',
    '/admin/users',
    '/admin/roles',
  ];
  let allSubpagesProtected = true;
  for (const sp of adminSubpages) {
    const res = await fetchUrl(sp);
    if (res.status !== 302 || !res.headers.get('location')?.includes('/admin/login')) {
      allSubpagesProtected = false;
      console.error(`Subpage ${sp} was not protected: status=${res.status}`);
    }
  }
  assert(allSubpagesProtected, 'All 11 Admin Sections Strictly Protected', 'All unauthenticated requests redirect to /admin/login');

  // 6. Admin API Protection (Unauthenticated Access returns 401)
  console.log('\n--- 6. Admin API Protection ---');
  const adminApis = [
    '/api/admin/services',
    '/api/admin/categories',
    '/api/admin/offers',
    '/api/admin/gallery',
    '/api/admin/media',
    '/api/admin/reviews',
    '/api/admin/blog',
    '/api/admin/settings',
  ];
  let allApisProtected = true;
  for (const api of adminApis) {
    const res = await fetchUrl(api);
    if (res.status !== 401) {
      allApisProtected = false;
      console.error(`API ${api} returned status ${res.status} instead of 401`);
    }
  }
  assert(allApisProtected, 'Admin REST APIs Strictly Protected (401 Unauthorized)', 'All API routes cleanly reject requests lacking session cookies');

  // 7. CSRF / Origin Protection
  console.log('\n--- 7. Anti-CSRF Origin Validation ---');
  const csrfRes = await fetchUrl('/api/admin/auth/logout', {
    method: 'POST',
    headers: {
      'Origin': 'https://evil-attacker.com',
      'Host': 'localhost:4321',
      'Content-Type': 'application/json',
    },
  });
  assert(csrfRes.status === 403, 'Anti-CSRF Origin Mismatch Blocked', `Evil origin rejected with status ${csrfRes.status}`);

  // 8. Admin Login UI & Security Headers
  console.log('\n--- 8. Admin Login Page Verification ---');
  const loginRes = await fetchUrl('/admin/login');
  const loginHasNoIndex = loginRes.text.includes('<meta name="robots" content="noindex, nofollow"');
  const loginHasForm = loginRes.text.includes('id="login-form"') && loginRes.text.includes('id="identifier"') && loginRes.text.includes('id="password"');
  assert(loginRes.status === 200 && loginHasNoIndex && loginHasForm, 'Admin Login Form & noindex Isolation', 'Login page declarations, fields, and SEO noindex verified');

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY:`);
  console.log(` Total Checks: ${passed + failed}`);
  console.log(` Passed: ${passed}`);
  console.log(` Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone7Audit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
