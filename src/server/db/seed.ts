import { getDb } from './index';
import {
  adminRoles,
  serviceCategories,
  mediaFiles,
  services,
  galleryItems,
  siteSettings,
} from './schema';
import { servicesData } from '../../data/services';
import { galleryImages } from '../../data/gallery';

/**
 * Safe, Idempotent Database Seeder for ALOR SPA
 * 
 * Strict Policies Enforced:
 * 1. Seed only verified baseline information.
 * 2. Do NOT create default admin accounts or hardcoded credentials.
 * 3. Do NOT seed invented prices or durations (stored as NULL with confirmed = 0).
 * 4. Do NOT seed invented customer reviews or ratings.
 * 5. Do NOT seed unverified location coordinates (coordinates set to NULL).
 * 6. Official WhatsApp number (966553543192) seeded with ON CONFLICT DO NOTHING.
 * 7. Running multiple times is completely idempotent and never overwrites data.
 */
export async function seedDatabase(customDbPath?: string): Promise<{
  rolesCount: number;
  categoriesCount: number;
  mediaCount: number;
  servicesCount: number;
  galleryCount: number;
  settingsCount: number;
}> {
  const { db } = getDb(customDbPath);
  const now = Date.now();

  console.log('[ALOR SPA] Starting database seed...');

  // 1. SEED DEFAULT ADMIN ROLES (idempotent: on conflict do nothing)
  const defaultRoles = [
    {
      id: 'role_super_admin',
      slug: 'super_admin',
      name_ar: 'مدير عام للنظام',
      name_en: 'Super Administrator',
      description: 'Full system privileges including user management, configuration, and audit logs.',
      permissions: ['*'],
      created_at: now,
    },
    {
      id: 'role_spa_manager',
      slug: 'spa_manager',
      name_ar: 'مديرة السبا',
      name_en: 'Spa Manager',
      description: 'Manages spa services, promotional offers, gallery photos, and reviews moderation.',
      permissions: [
        'services:read',
        'services:write',
        'offers:read',
        'offers:write',
        'gallery:read',
        'gallery:write',
        'reviews:read',
        'reviews:approve',
        'blog:read',
        'blog:write',
        'media:read',
        'media:write',
      ],
      created_at: now,
    },
    {
      id: 'role_content_editor',
      slug: 'content_editor',
      name_ar: 'محررة المحتوى',
      name_en: 'Content Editor',
      description: 'Can edit service copy, draft articles, and upload photos. Cannot modify pricing.',
      permissions: [
        'services:read',
        'services:edit_drafts',
        'offers:read',
        'offers:edit_drafts',
        'gallery:read',
        'gallery:write',
        'blog:read',
        'blog:write',
        'media:read',
        'media:write',
      ],
      created_at: now,
    },
  ];

  await db.insert(adminRoles).values(defaultRoles).onConflictDoNothing();

  // 2. SEED SERVICE CATEGORIES
  const defaultCategories = [
    {
      id: 'cat_massage',
      slug: 'massage',
      title_ar: 'جلسات المساج والتدليك',
      title_en: 'Massage & Bodywork',
      display_order: 1,
      is_active: 1,
    },
    {
      id: 'cat_bath',
      slug: 'bath',
      title_ar: 'طقوس الحمام المغربي الملكي',
      title_en: 'Royal Moroccan Hammam Rituals',
      display_order: 2,
      is_active: 1,
    },
    {
      id: 'cat_beauty',
      slug: 'beauty',
      title_ar: 'العناية بالأظافر والجمال',
      title_en: 'Nail & Beauty Care',
      display_order: 3,
      is_active: 1,
    },
    {
      id: 'cat_wellness',
      slug: 'wellness',
      title_ar: 'جلسات القوام والعافية',
      title_en: 'Body Sculpting & Wellness',
      display_order: 4,
      is_active: 1,
    },
  ];

  await db.insert(serviceCategories).values(defaultCategories).onConflictDoNothing();

  // 3. SEED BASELINE MEDIA FILES (For the 6 services and 6 gallery items)
  const initialMedia = [
    // Service Images
    {
      id: 'med_srv_relaxation_massage',
      filename: 'relaxation-massage.jpg',
      original_name: 'relaxation-massage.jpg',
      mime_type: 'image/jpeg',
      file_size: 245000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/relaxation-massage.jpg',
      public_url: '/images/services/relaxation-massage.jpg',
      alt_ar: 'جلسة مساج استرخائي هادئة في ألور سبا الرياض',
      alt_en: 'Relaxation massage session at ALOR SPA Riyadh',
      title_ar: 'المساج الاسترخائي',
      title_en: 'Relaxation Massage',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_therapeutic_massage',
      filename: 'therapeutic-massage.jpg',
      original_name: 'therapeutic-massage.jpg',
      mime_type: 'image/jpeg',
      file_size: 260000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/therapeutic-massage.jpg',
      public_url: '/images/services/therapeutic-massage.jpg',
      alt_ar: 'جلسة مساج علاجي عميق في ألور سبا الرياض',
      alt_en: 'Therapeutic deep tissue massage session at ALOR SPA Riyadh',
      title_ar: 'المساج العلاجي المركز',
      title_en: 'Therapeutic Massage',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_hot_stone_massage',
      filename: 'hot-stone-massage.jpg',
      original_name: 'hot-stone-massage.jpg',
      mime_type: 'image/jpeg',
      file_size: 275000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/hot-stone-massage.jpg',
      public_url: '/images/services/hot-stone-massage.jpg',
      alt_ar: 'جلسة مساج بالأحجار الساخنة في ألور سبا الرياض',
      alt_en: 'Hot stone massage treatment at ALOR SPA Riyadh',
      title_ar: 'مساج الأحجار البركانية الساخنة',
      title_en: 'Hot Stone Massage',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_moroccan_bath',
      filename: 'moroccan-bath.jpg',
      original_name: 'moroccan-bath.jpg',
      mime_type: 'image/jpeg',
      file_size: 290000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/moroccan-bath.jpg',
      public_url: '/images/services/moroccan-bath.jpg',
      alt_ar: 'طقوس الحمام المغربي الفاخر في ألور سبا الرياض',
      alt_en: 'Royal Moroccan bath hammam ritual at ALOR SPA Riyadh',
      title_ar: 'الحمام المغربي الملكي التراثي',
      title_en: 'Royal Moroccan Bath',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_body_sculpting_drainage',
      filename: 'body-sculpting-drainage.jpg',
      original_name: 'body-sculpting-drainage.jpg',
      mime_type: 'image/jpeg',
      file_size: 255000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/body-sculpting-drainage.jpg',
      public_url: '/images/services/body-sculpting-drainage.jpg',
      alt_ar: 'جلسة نحت الجسم وتصريف السوائل في ألور سبا الرياض',
      alt_en: 'Body sculpting and lymphatic drainage session at ALOR SPA Riyadh',
      title_ar: 'نحت الجسم وتصريف السوائل',
      title_en: 'Body Sculpting & Fluid Drainage',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_pedicure_manicure',
      filename: 'pedicure-manicure.jpg',
      original_name: 'pedicure-manicure.jpg',
      mime_type: 'image/jpeg',
      file_size: 240000,
      width: 1200,
      height: 800,
      storage_path: 'images/services/pedicure-manicure.jpg',
      public_url: '/images/services/pedicure-manicure.jpg',
      alt_ar: 'جلسة بديكير ومنيكير فاخرة في ألور سبا الرياض',
      alt_en: 'Luxury manicure and pedicure care at ALOR SPA Riyadh',
      title_ar: 'العناية الفاخرة بالأظافر والقدمين',
      title_en: 'Luxury Manicure & Pedicure',
      created_at: now,
      updated_at: now,
    },
    // Gallery Images
    ...galleryImages.map((img, index) => ({
      id: `med_gal_${index + 1}`,
      filename: `${img.id}.jpg`,
      original_name: `${img.id}.jpg`,
      mime_type: 'image/jpeg',
      file_size: 220000,
      width: 1200,
      height: 800,
      storage_path: `images/gallery/${img.id}.jpg`,
      public_url: img.src,
      alt_ar: img.alt.ar,
      alt_en: img.alt.en,
      title_ar: img.title.ar,
      title_en: img.title.en,
      created_at: now,
      updated_at: now,
    })),
  ];

  await db.insert(mediaFiles).values(initialMedia).onConflictDoNothing();

  // 4. SEED THE 6 SIGNATURE SERVICES (Directly from verified static data)
  const categoryMap: Record<string, string> = {
    massage: 'cat_massage',
    bath: 'cat_bath',
    beauty: 'cat_beauty',
    wellness: 'cat_wellness',
  };

  const imageMap: Record<string, string> = {
    'relaxation-massage': 'med_srv_relaxation_massage',
    'therapeutic-massage': 'med_srv_therapeutic_massage',
    'hot-stone-massage': 'med_srv_hot_stone_massage',
    'moroccan-bath': 'med_srv_moroccan_bath',
    'body-sculpting-drainage': 'med_srv_body_sculpting_drainage',
    'pedicure-manicure': 'med_srv_pedicure_manicure',
  };

  const servicesToSeed = servicesData.map((s, index) => ({
    id: s.id,
    category_id: categoryMap[s.category] || 'cat_massage',
    featured_image_id: imageMap[s.id] || null,
    slug: s.slug,
    title_ar: s.title.ar,
    title_en: s.title.en,
    subtitle_ar: s.subtitle.ar,
    subtitle_en: s.subtitle.en,
    description_ar: s.description.ar,
    description_en: s.description.en,
    detailed_description_ar: s.detailedDescription.ar,
    detailed_description_en: s.detailedDescription.en,
    is_signature: s.isSignature ? 1 : 0,
    is_published: 1,
    display_order: index + 1,

    // Strict Policy: Price and duration are NULL halalas and unconfirmed
    price_amount_halalas: null,
    price_currency: 'SAR',
    price_is_confirmed: 0,
    price_display_ar: s.price.display.ar || 'الأسعار عند الاستفسار',
    price_display_en: s.price.display.en || 'Price on inquiry',
    price_note_ar: s.price.note?.ar || null,
    price_note_en: s.price.note?.en || null,

    duration_minutes: null,
    duration_is_confirmed: 0,
    duration_display_ar: s.duration.display.ar || 'تحدد عند الحجز',
    duration_display_en: s.duration.display.en || 'Confirmed upon booking',
    duration_note_ar: s.duration.note?.ar || null,
    duration_note_en: s.duration.note?.en || null,

    features_ar: s.features.ar,
    features_en: s.features.en,
    benefits_ar: s.benefits.ar,
    benefits_en: s.benefits.en,
    steps_ar: s.steps.ar,
    steps_en: s.steps.en,
    includes_ar: s.includes.ar,
    includes_en: s.includes.en,

    suitability_ar: s.suitability.ar,
    suitability_en: s.suitability.en,
    advisory_ar: s.advisory.ar,
    advisory_en: s.advisory.en,

    seo_title_ar: s.seo.title.ar,
    seo_title_en: s.seo.title.en,
    seo_description_ar: s.seo.description.ar,
    seo_description_en: s.seo.description.en,

    created_at: now,
    updated_at: now,
  }));

  await db.insert(services).values(servicesToSeed).onConflictDoNothing();

  // 5. SEED GALLERY ITEMS (From verified static data)
  const galleryToSeed = galleryImages.map((img, index) => ({
    id: img.id,
    media_id: `med_gal_${index + 1}`,
    category: img.category,
    category_label_ar: img.categoryLabel.ar,
    category_label_en: img.categoryLabel.en,
    title_ar: img.title.ar,
    title_en: img.title.en,
    alt_ar: img.alt.ar,
    alt_en: img.alt.en,
    display_order: index + 1,
    is_published: 1,
    created_at: now,
    updated_at: now,
  }));

  await db.insert(galleryItems).values(galleryToSeed).onConflictDoNothing();

  // 6. SEED VERIFIED BASELINE SITE SETTINGS
  const baselineSettings = [
    {
      key: 'contact.whatsapp',
      value_ar: '966553543192',
      value_en: '966553543192',
      value_raw: '966553543192',
      group_name: 'contact',
      data_type: 'string',
      is_public: 1,
      is_immutable: 1, // Protected core setting
      updated_at: now,
    },
    {
      key: 'contact.phone',
      value_ar: '',
      value_en: '',
      value_raw: null,
      group_name: 'contact',
      data_type: 'string',
      is_public: 1,
      is_immutable: 0,
      updated_at: now,
    },
    {
      key: 'contact.email',
      value_ar: '',
      value_en: '',
      value_raw: null,
      group_name: 'contact',
      data_type: 'string',
      is_public: 1,
      is_immutable: 0,
      updated_at: now,
    },
    {
      key: 'contact.address',
      value_ar: 'الرياض، المملكة العربية السعودية (الموقع الدقيق يعلن قريباً)',
      value_en: 'Riyadh, Saudi Arabia (Exact location to be announced)',
      value_raw: null,
      group_name: 'contact',
      data_type: 'string',
      is_public: 1,
      is_immutable: 0,
      updated_at: now,
    },
    {
      // STRICT POLICY: Coordinates remain NULL until official address is confirmed
      key: 'contact.coordinates',
      value_ar: '',
      value_en: '',
      value_raw: null,
      group_name: 'contact',
      data_type: 'string',
      is_public: 1,
      is_immutable: 0,
      updated_at: now,
    },
    {
      key: 'hours.general',
      value_ar: 'من الساعة 11:00 صباحًا حتى الساعة 11:00 مساءً.',
      value_en: '11:00 AM – 11:00 PM',
      value_raw: '11:00 AM – 11:00 PM',
      group_name: 'hours',
      data_type: 'string',
      is_public: 1,
      is_immutable: 0,
      updated_at: now,
    },
  ];

  await db.insert(siteSettings).values(baselineSettings).onConflictDoNothing();

  // Run authoritative content sync (services, massage menu, offers, packages)
  const { seedAuthoritativeContent } = await import('../../../scripts/seed-authoritative-content');
  await seedAuthoritativeContent(customDbPath);

  console.log('✓ [ALOR SPA] Database seed completed successfully.');

  return {
    rolesCount: defaultRoles.length,
    categoriesCount: defaultCategories.length,
    mediaCount: initialMedia.length,
    servicesCount: servicesToSeed.length,
    galleryCount: galleryToSeed.length,
    settingsCount: baselineSettings.length,
  };
}

// Execute directly if run via CLI (e.g. `npx tsx src/server/db/seed.ts`)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('seed.ts') || 
  process.argv[1].endsWith('seed.js')
);

if (isDirectRun) {
  seedDatabase()
    .then((stats) => {
      console.log('Seed summary:', stats);
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ [ALOR SPA] Database seed failed:', err);
      process.exit(1);
    });
}
