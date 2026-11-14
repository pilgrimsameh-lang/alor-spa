import { getDb } from './index';
import {
  services,
  serviceCategories,
  mediaFiles,
  massageTypes,
  serviceVariants,
  offers,
  packages,
  packageOptions,
} from './schema';
import { eq, asc } from 'drizzle-orm';

export interface DbService {
  id: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryTitleAr: string;
  categoryTitleEn: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  detailedDescriptionAr: string[];
  detailedDescriptionEn: string[];
  priceAmountHalalas: number | null;
  priceCurrency: string;
  priceIsConfirmed: boolean;
  priceDisplayAr: string;
  priceDisplayEn: string;
  priceNoteAr: string | null;
  priceNoteEn: string | null;
  durationMinutes: number | null;
  durationIsConfirmed: boolean;
  durationDisplayAr: string;
  durationDisplayEn: string;
  imageUrl: string;
  imageAltAr: string;
  imageAltEn: string;
  featuresAr: string[];
  featuresEn: string[];
  benefitsAr: string[];
  benefitsEn: string[];
  stepsAr: { step: string; title: string; description: string }[];
  stepsEn: { step: string; title: string; description: string }[];
  includesAr: string[];
  includesEn: string[];
  suitabilityAr: string;
  suitabilityEn: string;
  advisoryAr: string;
  advisoryEn: string;
  displayOrder: number;
  isSignature: boolean;
  isPublished: boolean;
}

export interface DbMassageType {
  id: string;
  slug: string;
  serviceId: string | null;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  displayOrder: number;
  variants: DbServiceVariant[];
}

export interface DbServiceVariant {
  id: string;
  massageTypeId: string;
  serviceId: string | null;
  slug: string;
  durationMinutes: number;
  durationDisplayAr: string;
  durationDisplayEn: string;
  priceAmountHalalas: number;
  priceCurrency: string;
  priceDisplayAr: string;
  priceDisplayEn: string;
  displayOrder: number;
}

export interface DbOffer {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  includesAr: string[];
  includesEn: string[];
  priceAmountHalalas: number | null;
  priceCurrency: string;
  priceIsConfirmed: boolean;
  priceDisplayAr: string;
  priceDisplayEn: string;
  durationMinutes: number | null;
  durationDisplayAr: string;
  durationDisplayEn: string;
  badgeAr: string | null;
  badgeEn: string | null;
  imageUrl: string;
  imageAltAr: string;
  imageAltEn: string;
  displayOrder: number;
}

export interface DbPackage {
  id: string;
  slug: string;
  packageType: 'standard' | 'special';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  includesAr: string[];
  includesEn: string[];
  priceAmountHalalas: number | null;
  priceCurrency: string;
  priceDisplayAr: string;
  priceDisplayEn: string;
  badgeAr: string | null;
  badgeEn: string | null;
  imageUrl: string;
  imageAltAr: string;
  imageAltEn: string;
  displayOrder: number;
  options: DbPackageOption[];
}

export interface DbPackageOption {
  id: string;
  packageId: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  priceAmountHalalas: number;
  priceCurrency: string;
  priceDisplayAr: string;
  priceDisplayEn: string;
  displayOrder: number;
}

/**
 * Get all published services with categories and media images.
 */
export async function getDbServices(customDbPath?: string): Promise<DbService[]> {
  const { client } = getDb(customDbPath);

  const res = await client.execute(`
    SELECT 
      s.*,
      c.slug as category_slug,
      c.title_ar as category_title_ar,
      c.title_en as category_title_en,
      m.public_url as image_url,
      m.alt_ar as image_alt_ar,
      m.alt_en as image_alt_en
    FROM services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    LEFT JOIN media_files m ON s.featured_image_id = m.id
    WHERE s.is_published = 1
    ORDER BY s.display_order ASC;
  `);

  return res.rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    categoryId: r.category_id,
    categorySlug: r.category_slug || 'massage',
    categoryTitleAr: r.category_title_ar || '',
    categoryTitleEn: r.category_title_en || '',
    titleAr: r.title_ar,
    titleEn: r.title_en,
    subtitleAr: r.subtitle_ar,
    subtitleEn: r.subtitle_en,
    descriptionAr: r.description_ar,
    descriptionEn: r.description_en,
    detailedDescriptionAr: typeof r.detailed_description_ar === 'string' ? JSON.parse(r.detailed_description_ar) : r.detailed_description_ar,
    detailedDescriptionEn: typeof r.detailed_description_en === 'string' ? JSON.parse(r.detailed_description_en) : r.detailed_description_en,
    priceAmountHalalas: r.price_amount_halalas,
    priceCurrency: r.price_currency,
    priceIsConfirmed: Boolean(r.price_is_confirmed),
    priceDisplayAr: r.price_display_ar,
    priceDisplayEn: r.price_display_en,
    priceNoteAr: r.price_note_ar,
    priceNoteEn: r.price_note_en,
    durationMinutes: r.duration_minutes,
    durationIsConfirmed: Boolean(r.duration_is_confirmed),
    durationDisplayAr: r.duration_display_ar,
    durationDisplayEn: r.duration_display_en,
    imageUrl: r.image_url || '/images/services/relaxation-massage.jpg',
    imageAltAr: r.image_alt_ar || r.title_ar,
    imageAltEn: r.image_alt_en || r.title_en,
    featuresAr: typeof r.features_ar === 'string' ? JSON.parse(r.features_ar) : r.features_ar,
    featuresEn: typeof r.features_en === 'string' ? JSON.parse(r.features_en) : r.features_en,
    benefitsAr: typeof r.benefits_ar === 'string' ? JSON.parse(r.benefits_ar) : r.benefits_ar,
    benefitsEn: typeof r.benefits_en === 'string' ? JSON.parse(r.benefits_en) : r.benefits_en,
    stepsAr: typeof r.steps_ar === 'string' ? JSON.parse(r.steps_ar) : r.steps_ar,
    stepsEn: typeof r.steps_en === 'string' ? JSON.parse(r.steps_en) : r.steps_en,
    includesAr: typeof r.includes_ar === 'string' ? JSON.parse(r.includes_ar) : r.includes_ar,
    includesEn: typeof r.includes_en === 'string' ? JSON.parse(r.includes_en) : r.includes_en,
    suitabilityAr: r.suitability_ar,
    suitabilityEn: r.suitability_en,
    advisoryAr: r.advisory_ar,
    advisoryEn: r.advisory_en,
    displayOrder: r.display_order,
    isSignature: Boolean(r.is_signature),
    isPublished: Boolean(r.is_published),
  }));
}

/**
 * Get service by slug.
 */
export async function getDbServiceBySlug(slug: string, customDbPath?: string): Promise<DbService | null> {
  const all = await getDbServices(customDbPath);
  return all.find((s) => s.slug === slug) || null;
}

/**
 * Get official massage menu with 6 types and 18 duration variants.
 */
export async function getDbMassageMenu(customDbPath?: string): Promise<DbMassageType[]> {
  const { client } = getDb(customDbPath);

  const typesRes = await client.execute(`
    SELECT * FROM massage_types 
    WHERE is_active = 1 
    ORDER BY display_order ASC;
  `);

  const varsRes = await client.execute(`
    SELECT * FROM service_variants 
    WHERE is_active = 1 
    ORDER BY massage_type_id ASC, duration_minutes ASC;
  `);

  const variantsByType = new Map<string, DbServiceVariant[]>();
  for (const v of varsRes.rows as any[]) {
    const list = variantsByType.get(v.massage_type_id) || [];
    list.push({
      id: v.id,
      massageTypeId: v.massage_type_id,
      serviceId: v.service_id,
      slug: v.slug,
      durationMinutes: v.duration_minutes,
      durationDisplayAr: v.duration_display_ar,
      durationDisplayEn: v.duration_display_en,
      priceAmountHalalas: v.price_amount_halalas,
      priceCurrency: v.price_currency,
      priceDisplayAr: v.price_display_ar,
      priceDisplayEn: v.price_display_en,
      displayOrder: v.display_order,
    });
    variantsByType.set(v.massage_type_id, list);
  }

  return typesRes.rows.map((t: any) => ({
    id: t.id,
    slug: t.slug,
    serviceId: t.service_id,
    titleAr: t.title_ar,
    titleEn: t.title_en,
    subtitleAr: t.subtitle_ar,
    subtitleEn: t.subtitle_en,
    descriptionAr: t.description_ar,
    descriptionEn: t.description_en,
    displayOrder: t.display_order,
    variants: variantsByType.get(t.id) || [],
  }));
}

/**
 * Get active promotional offers.
 */
export async function getDbOffers(customDbPath?: string): Promise<DbOffer[]> {
  const { client } = getDb(customDbPath);

  const res = await client.execute(`
    SELECT 
      o.*,
      m.public_url as image_url,
      m.alt_ar as image_alt_ar,
      m.alt_en as image_alt_en
    FROM offers o
    LEFT JOIN media_files m ON o.image_id = m.id
    WHERE o.is_active = 1
    ORDER BY o.display_order ASC;
  `);

  return res.rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    titleAr: r.title_ar,
    titleEn: r.title_en,
    subtitleAr: r.subtitle_ar,
    subtitleEn: r.subtitle_en,
    descriptionAr: r.description_ar,
    descriptionEn: r.description_en,
    includesAr: typeof r.includes_ar === 'string' ? JSON.parse(r.includes_ar) : r.includes_ar,
    includesEn: typeof r.includes_en === 'string' ? JSON.parse(r.includes_en) : r.includes_en,
    priceAmountHalalas: r.price_amount_halalas,
    priceCurrency: r.price_currency,
    priceIsConfirmed: Boolean(r.price_is_confirmed),
    priceDisplayAr: r.price_display_ar,
    priceDisplayEn: r.price_display_en,
    durationMinutes: r.duration_minutes,
    durationDisplayAr: r.duration_display_ar,
    durationDisplayEn: r.duration_display_en,
    badgeAr: r.badge_ar,
    badgeEn: r.badge_en,
    imageUrl: r.image_url || '/images/services/relaxation-massage.jpg',
    imageAltAr: r.image_alt_ar || r.title_ar,
    imageAltEn: r.image_alt_en || r.title_en,
    displayOrder: r.display_order,
  }));
}

/**
 * Get packages (standard or special) with their options.
 */
export async function getDbPackages(
  type?: 'standard' | 'special',
  customDbPath?: string
): Promise<DbPackage[]> {
  const { client } = getDb(customDbPath);

  const typeClause = type ? `AND p.package_type = '${type}'` : '';
  const pkgRes = await client.execute(`
    SELECT 
      p.*,
      m.public_url as image_url,
      m.alt_ar as image_alt_ar,
      m.alt_en as image_alt_en
    FROM packages p
    LEFT JOIN media_files m ON p.image_id = m.id
    WHERE p.is_active = 1 ${typeClause}
    ORDER BY p.display_order ASC;
  `);

  const optRes = await client.execute(`
    SELECT * FROM package_options
    WHERE is_active = 1
    ORDER BY package_id ASC, display_order ASC;
  `);

  const optionsByPackage = new Map<string, DbPackageOption[]>();
  for (const o of optRes.rows as any[]) {
    const list = optionsByPackage.get(o.package_id) || [];
    list.push({
      id: o.id,
      packageId: o.package_id,
      slug: o.slug,
      titleAr: o.title_ar,
      titleEn: o.title_en,
      descriptionAr: o.description_ar,
      descriptionEn: o.description_en,
      priceAmountHalalas: o.price_amount_halalas,
      priceCurrency: o.price_currency,
      priceDisplayAr: o.price_display_ar,
      priceDisplayEn: o.price_display_en,
      displayOrder: o.display_order,
    });
    optionsByPackage.set(o.package_id, list);
  }

  return pkgRes.rows.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    packageType: p.package_type,
    titleAr: p.title_ar,
    titleEn: p.title_en,
    subtitleAr: p.subtitle_ar,
    subtitleEn: p.subtitle_en,
    descriptionAr: p.description_ar,
    descriptionEn: p.description_en,
    includesAr: typeof p.includes_ar === 'string' ? JSON.parse(p.includes_ar) : p.includes_ar,
    includesEn: typeof p.includes_en === 'string' ? JSON.parse(p.includes_en) : p.includes_en,
    priceAmountHalalas: p.price_amount_halalas,
    priceCurrency: p.price_currency,
    priceDisplayAr: p.price_display_ar,
    priceDisplayEn: p.price_display_en,
    badgeAr: p.badge_ar,
    badgeEn: p.badge_en,
    imageUrl: p.image_url || '/images/services/relaxation-massage.jpg',
    imageAltAr: p.image_alt_ar || p.title_ar,
    imageAltEn: p.image_alt_en || p.title_en,
    displayOrder: p.display_order,
    options: optionsByPackage.get(p.id) || [],
  }));
}
