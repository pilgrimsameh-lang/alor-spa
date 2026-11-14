import http from 'node:http';

async function fetchPage(url: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string; headers: http.IncomingHttpHeaders }> {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:4321${url}`;
  const res = await fetch(fullUrl, { headers });
  const text = await res.text();
  return { status: res.status, text, headers: Object.fromEntries(res.headers.entries()) };
}

async function runAudit() {
  console.log('=== Starting ALOR SPA Automated Deep Audit ===\n');

  const publicPages = [
    '/',
    '/en',
    '/services',
    '/en/services',
    '/services/relaxation-massage',
    '/services/integrated-4tech-massage',
    '/services/body-sculpting-drainage',
    '/services/hot-stone-massage',
    '/services/deep-tissue-massage',
    '/services/cupping-massage',
    '/services/therapeutic-massage',
    '/services/pedicure-manicure',
    '/services/moroccan-bath',
    '/en/services/relaxation-massage',
    '/en/services/integrated-4tech-massage',
    '/en/services/body-sculpting-drainage',
    '/en/services/hot-stone-massage',
    '/en/services/deep-tissue-massage',
    '/en/services/cupping-massage',
    '/en/services/therapeutic-massage',
    '/en/services/pedicure-manicure',
    '/en/services/moroccan-bath',
    '/robots.txt',
    '/sitemap.xml'
  ];

  const adminPages = [
    '/admin/login',
    '/admin',
    '/admin/services',
    '/admin/categories',
    '/admin/offers',
    '/admin/gallery',
    '/admin/reviews',
    '/admin/blog',
    '/admin/media',
    '/admin/settings',
    '/admin/users',
    '/admin/roles',
    '/admin/activity-logs'
  ];

  const issues: string[] = [];
  const checkedImages = new Set<string>();
  const checkedLinks = new Set<string>();

  // 1. Audit Public Pages
  for (const page of publicPages) {
    try {
      const res = await fetchPage(page);
      if (res.status !== 200) {
        issues.push(`[HTTP ${res.status}] Page ${page} failed to load with 200 OK`);
        continue;
      }

      if (page.endsWith('.txt') || page.endsWith('.xml')) {
        console.log(`✓ ${page} loaded (${res.text.length} bytes)`);
        continue;
      }

      const html = res.text;

      // Check title
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      if (!titleMatch || !titleMatch[1].trim()) {
        issues.push(`[SEO] Page ${page} missing or empty <title>`);
      }

      // Check meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      if (!descMatch || !descMatch[1].trim()) {
        issues.push(`[SEO] Page ${page} missing or empty meta description`);
      }

      // Check viewport
      if (!html.includes('viewport')) {
        issues.push(`[Mobile] Page ${page} missing viewport meta`);
      }

      // Check lang & dir
      const isEn = page.startsWith('/en');
      const expectedLang = isEn ? 'en' : 'ar';
      const expectedDir = isEn ? 'ltr' : 'rtl';

      if (!html.includes(`lang="${expectedLang}"`)) {
        issues.push(`[i18n] Page ${page} missing lang="${expectedLang}"`);
      }
      if (!html.includes(`dir="${expectedDir}"`)) {
        issues.push(`[i18n] Page ${page} missing dir="${expectedDir}"`);
      }

      // Check H1
      const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
      if (!h1Matches || h1Matches.length === 0) {
        issues.push(`[SEO] Page ${page} has no <h1>`);
      } else if (h1Matches.length > 1) {
        issues.push(`[SEO] Page ${page} has multiple <h1> tags (${h1Matches.length})`);
      }

      // Check images
      const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
      for (const match of imgMatches) {
        const fullTag = match[0];
        const src = match[1];
        if (!checkedImages.has(src)) {
          checkedImages.add(src);
          // verify src exists
          if (src.startsWith('/')) {
            const imgRes = await fetchPage(src);
            if (imgRes.status !== 200) {
              issues.push(`[Broken Image] Page ${page} image broken: ${src} (status ${imgRes.status})`);
            }
          }
        }
        // Check alt
        if (!fullTag.includes('alt=') || /alt=["']\s*["']/.test(fullTag)) {
          issues.push(`[A11y] Page ${page} image missing alt attribute or alt is empty: ${src}`);
        }
      }

      // Check WhatsApp links
      const waMatches = [...html.matchAll(/href=["'](https?:\/\/(?:wa\.me|api\.whatsapp\.com)[^"']*)["']/gi)];
      for (const waMatch of waMatches) {
        const waHref = waMatch[1];
        if (!waHref.includes('966553543192')) {
          issues.push(`[WhatsApp] Page ${page} has incorrect WhatsApp number in href: ${waHref}`);
        }
      }

      console.log(`✓ ${page} passed basic validation (title, desc, h1, images)`);
    } catch (err: any) {
      issues.push(`[Error] Page ${page} threw error during audit: ${err.message}`);
    }
  }

  // 2. Audit Admin Pages (unauthenticated should redirect to /admin/login or deny)
  console.log('\n--- Checking Unauthenticated Admin Pages ---');
  for (const page of adminPages) {
    try {
      const res = await fetchPage(page);
      if (page === '/admin/login') {
        if (res.status !== 200) {
          issues.push(`[Admin] Login page ${page} returned status ${res.status}`);
        } else {
          console.log(`✓ ${page} rendered login form`);
        }
      } else {
        // Should either redirect to login (302) or render 401/403 or AccessDenied
        const html = res.text;
        const isProtected = res.status === 302 || res.status === 401 || res.status === 403 || html.includes('login') || html.includes('Access Denied') || html.includes('غير مصرح') || html.includes('تسجيل الدخول');
        if (!isProtected) {
          issues.push(`[Security] Admin page ${page} may not be protected without login (Status: ${res.status})`);
        } else {
          console.log(`✓ ${page} safely protected against unauthenticated access`);
        }
      }
    } catch (err: any) {
      issues.push(`[Admin Error] Admin page ${page} threw error: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log(`Audit Complete. Total Issues Found: ${issues.length}`);
  for (const issue of issues) {
    console.error(`  - ${issue}`);
  }
  console.log('========================================\n');
}

runAudit().catch(console.error);
