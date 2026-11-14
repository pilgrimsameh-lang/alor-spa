async function scanEnglishPagesForArabic() {
  console.log('=== Scanning Rendered English Pages for Arabic Leaks ===\n');

  const enPages = [
    '/en',
    '/en/services',
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

  for (const page of enPages) {
    const res = await fetch(`http://localhost:4321${page}`);
    const html = await res.text();

    // Strip HTML scripts, style tags, json-ld schema
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Note: The Language Switcher is expected to show "العربية" because it's the target language button!
    // And schema alternate names or hreflang might have ar.
    // Let's strip the language switcher itself from cleanHtml
    cleanHtml = cleanHtml.replace(/<a[^>]*aria-label="التبديل إلى اللغة العربية"[\s\S]*?<\/a>/gi, '');
    cleanHtml = cleanHtml.replace(/<a[^>]*href="\/"[\s\S]*?العربية[\s\S]*?<\/a>/gi, '');

    // Now find any remaining Arabic characters in visible text or titles
    const matches = cleanHtml.match(/[\u0600-\u06FF\u0750-\u077F]{2,}/g) || [];
    // Filter out matches in json or hreflang if any remained
    if (matches.length > 0) {
      console.log(`[!] Found ${matches.length} Arabic words on English page ${page}:`);
      // print unique matches
      const unique = Array.from(new Set(matches));
      console.log(`    Words: ${unique.slice(0, 10).join(', ')}`);
    } else {
      console.log(`✓ Page ${page} is 100% free of unintended Arabic text`);
    }
  }
}

scanEnglishPagesForArabic().catch(console.error);
