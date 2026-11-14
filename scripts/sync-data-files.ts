import fs from 'node:fs';
import path from 'node:path';
import { getDbServices, getDbOffers, getDbPackages, getDbMassageMenu } from '../src/server/db/queries';

async function syncFiles() {
  console.log('Fetching authoritative data from SQLite...');
  const services = await getDbServices();
  const offers = await getDbOffers();
  const stdPackages = await getDbPackages('standard');
  const specialPackages = await getDbPackages('special');
  const massageMenu = await getDbMassageMenu();

  // 1. SYNC src/data/services.ts
  const servicesCode = `/**
 * ALOR SPA — Official Service Offerings Data
 * Authoritative source synced with SQLite relational database.
 * Total Services: ${services.length}
 */

export interface ServiceStep {
  step: string;
  title: string;
  description: string;
}

export interface ServicePrice {
  amount?: number;
  currency?: string;
  isConfirmed: boolean;
  display: {
    ar: string;
    en: string;
  };
  note?: {
    ar: string;
    en: string;
  };
}

export interface ServiceDuration {
  minutes?: number;
  isConfirmed: boolean;
  display: {
    ar: string;
    en: string;
  };
  note?: {
    ar: string;
    en: string;
  };
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: {
    ar: string;
    en: string;
  };
  subtitle: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  detailedDescription: {
    ar: string[];
    en: string[];
  };
  image: string;
  imageAlt: {
    ar: string;
    en: string;
  };
  category: 'massage' | 'bath' | 'beauty' | 'wellness';
  isSignature?: boolean;
  price: ServicePrice;
  duration: ServiceDuration;
  features: {
    ar: string[];
    en: string[];
  };
  benefits: {
    ar: string[];
    en: string[];
  };
  steps: {
    ar: ServiceStep[];
    en: ServiceStep[];
  };
  includes: {
    ar: string[];
    en: string[];
  };
  suitability: {
    ar: string;
    en: string;
  };
  advisory: {
    ar: string;
    en: string;
  };
  seo: {
    title: {
      ar: string;
      en: string;
    };
    description: {
      ar: string;
      en: string;
    };
  };
}

export const servicesData: ServiceItem[] = ${JSON.stringify(
    services.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: { ar: s.titleAr, en: s.titleEn },
      subtitle: { ar: s.subtitleAr, en: s.subtitleEn },
      description: { ar: s.descriptionAr, en: s.descriptionEn },
      detailedDescription: { ar: s.detailedDescriptionAr, en: s.detailedDescriptionEn },
      image: s.imageUrl,
      imageAlt: { ar: s.imageAltAr, en: s.imageAltEn },
      category: s.categorySlug as any,
      isSignature: s.isSignature,
      price: {
        amount: s.priceAmountHalalas ? s.priceAmountHalalas / 100 : undefined,
        currency: s.priceCurrency,
        isConfirmed: s.priceIsConfirmed,
        display: { ar: s.priceDisplayAr, en: s.priceDisplayEn },
        note: s.priceNoteAr ? { ar: s.priceNoteAr, en: s.priceNoteEn || '' } : undefined,
      },
      duration: {
        minutes: s.durationMinutes || undefined,
        isConfirmed: s.durationIsConfirmed,
        display: { ar: s.durationDisplayAr, en: s.durationDisplayEn },
        note: {
          ar: 'تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي',
          en: 'Duration is tailored to your preference upon booking',
        },
      },
      features: { ar: s.featuresAr, en: s.featuresEn },
      benefits: { ar: s.benefitsAr, en: s.benefitsEn },
      steps: { ar: s.stepsAr, en: s.stepsEn },
      includes: { ar: s.includesAr, en: s.includesEn },
      suitability: { ar: s.suitabilityAr, en: s.suitabilityEn },
      advisory: { ar: s.advisoryAr, en: s.advisoryEn },
      seo: {
        title: {
          ar: s.titleAr + ' بالرياض | ألور سبا — ALOR SPA',
          en: s.titleEn + ' in Riyadh | ALOR SPA',
        },
        description: {
          ar: s.descriptionAr,
          en: s.descriptionEn,
        },
      },
    })),
    null,
    2
  )};

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return servicesData.find((s) => s.slug === slug);
}

export function getRelatedServices(currentSlug: string, count: number = 3): ServiceItem[] {
  const current = getServiceBySlug(currentSlug);
  if (!current) return servicesData.slice(0, count);
  return servicesData
    .filter((s) => s.slug !== currentSlug)
    .sort((a, b) => (a.category === current.category ? -1 : 1))
    .slice(0, count);
}
`;

  fs.writeFileSync(path.resolve('src/data/services.ts'), servicesCode, 'utf-8');
  console.log(`✓ Updated src/data/services.ts (${services.length} services)`);

  // 2. SYNC src/data/offers.ts
  const offersCode = `/**
 * ALOR SPA — Official Promotional & Seasonal Offerings Data
 * Authoritative source synced with SQLite relational database.
 * Total Offers: ${offers.length}
 */

export interface OfferItem {
  id: string;
  slug: string;
  badge?: {
    ar: string;
    en: string;
  };
  title: {
    ar: string;
    en: string;
  };
  subtitle: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  includes: {
    ar: string[];
    en: string[];
  };
  price: {
    amount?: number;
    currency: string;
    isConfirmed: boolean;
    display: {
      ar: string;
      en: string;
    };
  };
  duration?: {
    minutes?: number;
    display: {
      ar: string;
      en: string;
    };
  };
  image?: string;
  isFeatured?: boolean;
}

export const activeOffers: OfferItem[] = ${JSON.stringify(
    offers.map((o) => ({
      id: o.id,
      slug: o.slug,
      badge: o.badgeAr ? { ar: o.badgeAr, en: o.badgeEn || '' } : undefined,
      title: { ar: o.titleAr, en: o.titleEn },
      subtitle: { ar: o.subtitleAr, en: o.subtitleEn },
      description: { ar: o.descriptionAr, en: o.descriptionEn },
      includes: { ar: o.includesAr, en: o.includesEn },
      price: {
        amount: o.priceAmountHalalas ? o.priceAmountHalalas / 100 : undefined,
        currency: o.priceCurrency,
        isConfirmed: o.priceIsConfirmed,
        display: { ar: o.priceDisplayAr, en: o.priceDisplayEn },
      },
      duration: o.durationMinutes
        ? {
            minutes: o.durationMinutes,
            display: { ar: o.durationDisplayAr, en: o.durationDisplayEn },
          }
        : undefined,
      image: o.imageUrl,
      isFeatured: true,
    })),
    null,
    2
  )};
`;

  fs.writeFileSync(path.resolve('src/data/offers.ts'), offersCode, 'utf-8');
  console.log(`✓ Updated src/data/offers.ts (${offers.length} offers)`);

  // 3. CREATE src/data/packages.ts
  const packagesCode = `/**
 * ALOR SPA — Official Packages & Special Experiences Data
 * Authoritative source synced with SQLite relational database.
 * Total Standard Packages: ${stdPackages.length}
 * Total Special Packages: ${specialPackages.length}
 * Total Massage Menu Types: ${massageMenu.length}
 */

export interface PackageOptionItem {
  id: string;
  slug: string;
  title: {
    ar: string;
    en: string;
  };
  description?: {
    ar: string;
    en: string;
  };
  price: {
    amount: number;
    currency: string;
    display: {
      ar: string;
      en: string;
    };
  };
}

export interface PackageItem {
  id: string;
  slug: string;
  packageType: 'standard' | 'special';
  title: {
    ar: string;
    en: string;
  };
  subtitle?: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  includes: {
    ar: string[];
    en: string[];
  };
  priceDisplay: {
    ar: string;
    en: string;
  };
  priceAmount?: number;
  badge?: {
    ar: string;
    en: string;
  };
  image?: string;
  options?: PackageOptionItem[];
}

export interface MassageVariantItem {
  durationMinutes: number;
  durationDisplay: {
    ar: string;
    en: string;
  };
  priceDisplay: {
    ar: string;
    en: string;
  };
  priceAmount: number;
}

export interface MassageTypeItem {
  id: string;
  slug: string;
  title: {
    ar: string;
    en: string;
  };
  subtitle?: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  variants: MassageVariantItem[];
}

export const standardPackages: PackageItem[] = ${JSON.stringify(
    stdPackages.map((p) => ({
      id: p.id,
      slug: p.slug,
      packageType: p.packageType,
      title: { ar: p.titleAr, en: p.titleEn },
      subtitle: { ar: p.subtitleAr, en: p.subtitleEn },
      description: { ar: p.descriptionAr, en: p.descriptionEn },
      includes: { ar: p.includesAr, en: p.includesEn },
      priceDisplay: { ar: p.priceDisplayAr, en: p.priceDisplayEn },
      priceAmount: p.priceAmountHalalas ? p.priceAmountHalalas / 100 : undefined,
      badge: p.badgeAr ? { ar: p.badgeAr, en: p.badgeEn || '' } : undefined,
      image: p.imageUrl,
    })),
    null,
    2
  )};

export const specialPackages: PackageItem[] = ${JSON.stringify(
    specialPackages.map((p) => ({
      id: p.id,
      slug: p.slug,
      packageType: p.packageType,
      title: { ar: p.titleAr, en: p.titleEn },
      subtitle: { ar: p.subtitleAr, en: p.subtitleEn },
      description: { ar: p.descriptionAr, en: p.descriptionEn },
      includes: { ar: p.includesAr, en: p.includesEn },
      priceDisplay: { ar: p.priceDisplayAr, en: p.priceDisplayEn },
      priceAmount: p.priceAmountHalalas ? p.priceAmountHalalas / 100 : undefined,
      badge: p.badgeAr ? { ar: p.badgeAr, en: p.badgeEn || '' } : undefined,
      image: p.imageUrl,
      options: p.options.map((o) => ({
        id: o.id,
        slug: o.slug,
        title: { ar: o.titleAr, en: o.titleEn },
        description: o.descriptionAr ? { ar: o.descriptionAr, en: o.descriptionEn || '' } : undefined,
        price: {
          amount: o.priceAmountHalalas / 100,
          currency: o.priceCurrency,
          display: { ar: o.priceDisplayAr, en: o.priceDisplayEn },
        },
      })),
    })),
    null,
    2
  )};

export const massageMenuCatalog: MassageTypeItem[] = ${JSON.stringify(
    massageMenu.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: { ar: m.titleAr, en: m.titleEn },
      subtitle: { ar: m.subtitleAr, en: m.subtitleEn },
      description: { ar: m.descriptionAr, en: m.descriptionEn },
      variants: m.variants.map((v) => ({
        durationMinutes: v.durationMinutes,
        durationDisplay: { ar: v.durationDisplayAr, en: v.durationDisplayEn },
        priceDisplay: { ar: v.priceDisplayAr, en: v.priceDisplayEn },
        priceAmount: v.priceAmountHalalas / 100,
      })),
    })),
    null,
    2
  )};
`;

  fs.writeFileSync(path.resolve('src/data/packages.ts'), packagesCode, 'utf-8');
  console.log(`✓ Created src/data/packages.ts (${stdPackages.length} std pkgs, ${specialPackages.length} special pkgs, ${massageMenu.length} massage types)`);
}

syncFiles().catch(console.error);
