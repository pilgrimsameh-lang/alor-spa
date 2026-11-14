import { servicesData } from '../src/data/services';
import { activeOffers } from '../src/data/offers';
import { standardPackages, specialPackages, massageMenuCatalog } from '../src/data/packages';
import { galleryImages } from '../src/data/gallery';

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F]/.test(text);
}

function checkDataIntegrity() {
  console.log('=== Checking Data Integrity & Translation Purity ===\n');
  const issues: string[] = [];

  // 1. Services Data
  servicesData.forEach((s) => {
    if (!s.title.ar || !s.title.en) issues.push(`Service ${s.slug} missing title`);
    if (!s.description.ar || !s.description.en) issues.push(`Service ${s.slug} missing description`);
    if (hasArabic(s.title.en)) issues.push(`Service ${s.slug} has Arabic in title.en: "${s.title.en}"`);
    if (hasArabic(s.description.en)) issues.push(`Service ${s.slug} has Arabic in description.en`);
    if (!s.price || !s.price.display?.ar || !s.price.display?.en) issues.push(`Service ${s.slug} missing price display`);
    if (!s.duration || !s.duration.display?.ar || !s.duration.display?.en) issues.push(`Service ${s.slug} missing duration display`);
  });

  // 2. Active Offers
  activeOffers.forEach((o) => {
    if (!o.title.ar || !o.title.en) issues.push(`Offer ${o.id} missing title`);
    if (hasArabic(o.title.en)) issues.push(`Offer ${o.id} has Arabic in title.en: "${o.title.en}"`);
    if (hasArabic(o.description.en)) issues.push(`Offer ${o.id} has Arabic in description.en`);
  });

  // 3. Packages
  [...standardPackages, ...specialPackages].forEach((p) => {
    if (!p.title.ar || !p.title.en) issues.push(`Package ${p.id} missing title`);
    if (hasArabic(p.title.en)) issues.push(`Package ${p.id} has Arabic in title.en: "${p.title.en}"`);
    if (hasArabic(p.description.en)) issues.push(`Package ${p.id} has Arabic in description.en`);
  });

  // 4. Massage Menu
  massageMenuCatalog.forEach((m) => {
    if (!m.title.ar || !m.title.en) issues.push(`Massage ${m.id} missing title`);
    if (hasArabic(m.title.en)) issues.push(`Massage ${m.id} has Arabic in title.en: "${m.title.en}"`);
    m.variants.forEach((v) => {
      if (hasArabic(v.durationDisplay.en)) issues.push(`Massage ${m.id} variant durationDisplay.en has Arabic`);
      if (hasArabic(v.priceDisplay.en)) issues.push(`Massage ${m.id} variant priceDisplay.en has Arabic`);
    });
  });

  // 5. Gallery
  galleryImages.forEach((g) => {
    if (!g.title.ar || !g.title.en) issues.push(`Gallery ${g.id} missing title`);
    if (hasArabic(g.title.en)) issues.push(`Gallery ${g.id} has Arabic in title.en: "${g.title.en}"`);
    if (hasArabic(g.alt.en)) issues.push(`Gallery ${g.id} has Arabic in alt.en`);
  });

  console.log(`Found ${issues.length} data translation purity issues:`);
  issues.forEach((iss) => console.log('  - ' + iss));
  console.log('=== End Data Integrity Check ===\n');
}

checkDataIntegrity();
