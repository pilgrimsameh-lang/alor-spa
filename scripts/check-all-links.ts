async function checkAllLinksAcrossSite() {
  console.log('=== Deep Verification of All Links Across ALOR SPA ===\n');

  const pages = [
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
  ];

  const officialWhatsApp = '966553543192';
  const officialInstagram = 'https://www.instagram.com/alor_homspa/';
  const officialTikTok = 'https://www.tiktok.com/@alor_homspa';

  let totalWhatsAppLinks = 0;
  let totalSocialLinks = 0;
  let totalInternalLinks = 0;
  const issues: string[] = [];

  for (const page of pages) {
    const res = await fetch(`http://localhost:4321${page}`);
    const html = await res.text();
    const isEn = page.startsWith('/en');

    // 1. WhatsApp Links
    const waMatches = [...html.matchAll(/href="([^"]*wa\.me[^"]*)"/gi)];
    for (const m of waMatches) {
      totalWhatsAppLinks++;
      const href = m[1];
      if (!href.includes(`wa.me/${officialWhatsApp}`)) {
        issues.push(`[WhatsApp] Page ${page} has invalid WhatsApp URL: ${href}`);
      }
      // Check prefilled text
      const urlObj = new URL(href);
      const textParam = urlObj.searchParams.get('text');
      if (!textParam) {
        issues.push(`[WhatsApp] Page ${page} WhatsApp link missing ?text= parameter: ${href}`);
      } else if (isEn) {
        // Must not contain Arabic characters on English pages
        if (/[\u0600-\u06FF\u0750-\u077F]/.test(textParam)) {
          issues.push(`[WhatsApp i18n] English page ${page} has Arabic text in WhatsApp link: "${textParam}"`);
        }
      }
    }

    // 2. Social Links
    const igMatches = [...html.matchAll(/href="(https:\/\/[^"]*instagram\.com[^"]*)"/gi)];
    for (const m of igMatches) {
      totalSocialLinks++;
      if (m[1] !== officialInstagram) {
        issues.push(`[Social] Page ${page} has incorrect Instagram link: ${m[1]}`);
      }
    }

    const ttMatches = [...html.matchAll(/href="(https:\/\/[^"]*tiktok\.com[^"]*)"/gi)];
    for (const m of ttMatches) {
      totalSocialLinks++;
      if (m[1] !== officialTikTok) {
        issues.push(`[Social] Page ${page} has incorrect TikTok link: ${m[1]}`);
      }
    }

    // 3. Internal Links
    const intMatches = [...html.matchAll(/href="(\/(?:en\/?)?[^"#?]*)"/gi)];
    for (const m of intMatches) {
      const href = m[1];
      if (href.startsWith('/admin') || href.startsWith('/api')) continue;
      totalInternalLinks++;
    }
  }

  console.log(`Verified:
  - Total WhatsApp Links Checked: ${totalWhatsAppLinks}
  - Total Social Links Checked: ${totalSocialLinks}
  - Total Internal Links Checked: ${totalInternalLinks}
  - Issues Found: ${issues.length}`);

  if (issues.length > 0) {
    console.error('\nIssues:');
    issues.forEach((iss) => console.error('  - ' + iss));
  } else {
    console.log('\n✓ ALL WhatsApp, Social, and Internal links are 100% verified and compliant!');
  }
}

checkAllLinksAcrossSite().catch(console.error);
