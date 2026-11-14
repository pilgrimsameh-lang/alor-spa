async function auditStructuredData() {
  console.log('=== Checking Schema.org Structured Data across Pages ===\n');

  const pages = [
    '/',
    '/en',
    '/services',
    '/en/services',
    '/services/relaxation-massage',
    '/en/services/relaxation-massage',
  ];

  let hasErrors = false;

  for (const page of pages) {
    const res = await fetch(`http://localhost:4321${page}`);
    const html = await res.text();

    const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    if (!ldMatches.length) {
      console.error(`✗ [JSON-LD] No application/ld+json found on ${page}`);
      hasErrors = true;
      continue;
    }

    for (let i = 0; i < ldMatches.length; i++) {
      try {
        const json = JSON.parse(ldMatches[i][1]);
        if (!json['@context'] || json['@context'] !== 'https://schema.org') {
          console.error(`✗ [JSON-LD] Invalid @context on ${page}`);
          hasErrors = true;
        }

        const graph = json['@graph'] || [json];
        const types = graph.map((item: any) => item['@type']).flat();
        console.log(`✓ Page ${page} JSON-LD #${i + 1} valid. Types: ${types.join(', ')}`);
      } catch (err: any) {
        console.error(`✗ [JSON-LD] JSON parse error on ${page}: ${err.message}`);
        hasErrors = true;
      }
    }
  }

  if (!hasErrors) {
    console.log('\n✓ All Schema.org JSON-LD graphs are valid and well-formed!');
  } else {
    console.error('\n✗ Some Schema.org JSON-LD graphs had errors.');
  }
}

auditStructuredData().catch(console.error);
