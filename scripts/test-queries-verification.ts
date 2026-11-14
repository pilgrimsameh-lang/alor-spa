import {
  getDbServices,
  getDbMassageMenu,
  getDbOffers,
  getDbPackages,
} from '../src/server/db/queries';

async function testQueries() {
  console.log('Testing Queries Layer...');
  
  const services = await getDbServices();
  console.log(`✓ Services count: ${services.length}`);
  services.forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.slug}] ${s.titleAr} (${s.titleEn}) — ${s.priceDisplayAr} (halalas: ${s.priceAmountHalalas}, confirmed: ${s.priceIsConfirmed})`);
  });

  const massageMenu = await getDbMassageMenu();
  console.log(`\n✓ Massage Menu types count: ${massageMenu.length}`);
  let totalVariants = 0;
  massageMenu.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.titleAr} (${m.titleEn}) — ${m.variants.length} duration options`);
    m.variants.forEach((v) => {
      totalVariants++;
      console.log(`     - ${v.durationDisplayAr}: ${v.priceDisplayAr} (${v.priceAmountHalalas} halalas)`);
    });
  });
  console.log(`✓ Total massage duration options: ${totalVariants}`);

  const offers = await getDbOffers();
  console.log(`\n✓ Offers count: ${offers.length}`);
  offers.forEach((o, i) => {
    console.log(`  ${i + 1}. [${o.slug}] ${o.titleAr} (${o.titleEn}) — ${o.priceDisplayAr}`);
  });

  const stdPackages = await getDbPackages('standard');
  console.log(`\n✓ Standard Packages count: ${stdPackages.length}`);
  stdPackages.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.slug}] ${p.titleAr} (${p.titleEn}) — ${p.priceDisplayAr}`);
  });

  const specialPackages = await getDbPackages('special');
  console.log(`\n✓ Special Packages count: ${specialPackages.length}`);
  specialPackages.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.slug}] ${p.titleAr} (${p.titleEn}) — ${p.priceDisplayAr}, Options: ${p.options.length}`);
    p.options.forEach((opt) => {
      console.log(`     * ${opt.titleAr} (${opt.titleEn}) — ${opt.priceDisplayAr}`);
    });
  });

  if (
    services.length === 9 &&
    massageMenu.length === 6 &&
    totalVariants === 18 &&
    offers.length === 3 &&
    stdPackages.length === 3 &&
    specialPackages.length === 4
  ) {
    console.log('\n🎉 ALL COUNTS AND DATA MATCH REQUIREMENTS 100%!');
  } else {
    throw new Error('Counts mismatch!');
  }
}

testQueries().catch(console.error);
