import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

/**
 * ============================================================================
 * ALOR SPA — Official Relational Database Schema (Drizzle ORM)
 * Exactly 12 Tables with Strict Referential Integrity & Halalas Monetary Storage
 * ============================================================================
 */

// 1. ADMIN ROLES
export const adminRoles = sqliteTable(
  'admin_roles',
  {
    id: text('id').primaryKey(), // e.g. 'role_super_admin', 'role_spa_manager', 'role_content_editor'
    slug: text('slug').notNull().unique(),
    name_ar: text('name_ar').notNull(),
    name_en: text('name_en').notNull(),
    description: text('description'),
    permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
    created_at: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_admin_roles_slug').on(table.slug),
  ]
);

// 2. ADMIN USERS
export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: text('id').primaryKey(), // UUID
    role_id: text('role_id')
      .notNull()
      .references(() => adminRoles.id, { onDelete: 'restrict' }),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(), // Argon2id hash
    full_name: text('full_name').notNull(),
    is_active: integer('is_active').notNull().default(1),
    failed_login_attempts: integer('failed_login_attempts').notNull().default(0),
    locked_until: integer('locked_until'),
    last_login_at: integer('last_login_at'),
    security_generation: integer('security_generation').notNull().default(1),
    login_generation: integer('login_generation').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_admin_users_username').on(table.username),
    index('idx_admin_users_email').on(table.email),
    index('idx_admin_users_role_id').on(table.role_id),
    check('chk_admin_users_failed_attempts', sql`${table.failed_login_attempts} >= 0`),
    check('chk_admin_users_security_gen', sql`${table.security_generation} >= 1`),
    check('chk_admin_users_login_gen', sql`${table.login_generation} >= 1`),
  ]
);

// 3. ADMIN SESSIONS
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(), // UUID
    user_id: text('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    token_hash: text('token_hash').notNull().unique(), // SHA-256 hash of random token
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    security_generation: integer('security_generation').notNull().default(1),
    created_at: integer('created_at').notNull(),
    last_activity_at: integer('last_activity_at').notNull(),
    expires_at: integer('expires_at').notNull(), // Absolute expiry: 7 days
    revoked_at: integer('revoked_at'), // Revocation timestamp
  },
  (table) => [
    index('idx_admin_sessions_token_hash').on(table.token_hash),
    index('idx_admin_sessions_user_id').on(table.user_id),
    index('idx_admin_sessions_expires_at').on(table.expires_at),
    index('idx_admin_sessions_user_sec').on(table.user_id, table.security_generation),
    check('chk_admin_sessions_security_gen', sql`${table.security_generation} >= 1`),
  ]
);

// 4. SERVICE CATEGORIES
export const serviceCategories = sqliteTable(
  'service_categories',
  {
    id: text('id').primaryKey(), // 'cat_massage', 'cat_bath', 'cat_beauty', 'cat_wellness'
    slug: text('slug').notNull().unique(),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    display_order: integer('display_order').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
  },
  (table) => [
    index('idx_service_categories_slug').on(table.slug),
  ]
);

// 5. MEDIA FILES (Master Registry)
export const mediaFiles = sqliteTable(
  'media_files',
  {
    id: text('id').primaryKey(), // UUID
    filename: text('filename').notNull(), // Hash name on disk (e.g. hash.webp)
    original_name: text('original_name').notNull(),
    mime_type: text('mime_type').notNull(),
    file_size: integer('file_size').notNull(), // bytes
    width: integer('width'),
    height: integer('height'),
    storage_path: text('storage_path').notNull(), // Relative disk path or cloud key
    public_url: text('public_url').notNull(),
    alt_ar: text('alt_ar').notNull().default(''),
    alt_en: text('alt_en').notNull().default(''),
    title_ar: text('title_ar'),
    title_en: text('title_en'),
    uploaded_by: text('uploaded_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_media_files_created').on(table.created_at),
  ]
);

// 6. SERVICES
export const services = sqliteTable(
  'services',
  {
    id: text('id').primaryKey(), // e.g. 'relaxation-massage'
    category_id: text('category_id')
      .notNull()
      .references(() => serviceCategories.id, { onDelete: 'restrict' }),
    featured_image_id: text('featured_image_id').references(() => mediaFiles.id, {
      onDelete: 'restrict',
    }),
    slug: text('slug').notNull().unique(),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    subtitle_ar: text('subtitle_ar').notNull(),
    subtitle_en: text('subtitle_en').notNull(),
    description_ar: text('description_ar').notNull(),
    description_en: text('description_en').notNull(),
    detailed_description_ar: text('detailed_description_ar', { mode: 'json' })
      .notNull()
      .$type<string[]>(),
    detailed_description_en: text('detailed_description_en', { mode: 'json' })
      .notNull()
      .$type<string[]>(),
    is_signature: integer('is_signature').notNull().default(0),
    is_published: integer('is_published').notNull().default(1),
    display_order: integer('display_order').notNull().default(0),

    // Monetary storage in Saudi halalas (100 halalas = 1 SAR, integer prevents floating-point rounding errors)
    price_amount_halalas: integer('price_amount_halalas'), // NULL when unconfirmed
    price_currency: text('price_currency').notNull().default('SAR'),
    price_is_confirmed: integer('price_is_confirmed').notNull().default(0),
    price_display_ar: text('price_display_ar').notNull().default('الأسعار عند الاستفسار'),
    price_display_en: text('price_display_en').notNull().default('Price on inquiry'),
    price_note_ar: text('price_note_ar'),
    price_note_en: text('price_note_en'),

    // Duration storage
    duration_minutes: integer('duration_minutes'), // NULL when unconfirmed
    duration_is_confirmed: integer('duration_is_confirmed').notNull().default(0),
    duration_display_ar: text('duration_display_ar').notNull().default('تحدد عند الحجز'),
    duration_display_en: text('duration_display_en').notNull().default('Confirmed upon booking'),
    duration_note_ar: text('duration_note_ar'),
    duration_note_en: text('duration_note_en'),

    // Bilingual arrays
    features_ar: text('features_ar', { mode: 'json' }).notNull().$type<string[]>(),
    features_en: text('features_en', { mode: 'json' }).notNull().$type<string[]>(),
    benefits_ar: text('benefits_ar', { mode: 'json' }).notNull().$type<string[]>(),
    benefits_en: text('benefits_en', { mode: 'json' }).notNull().$type<string[]>(),
    steps_ar: text('steps_ar', { mode: 'json' })
      .notNull()
      .$type<{ step: string; title: string; description: string }[]>(),
    steps_en: text('steps_en', { mode: 'json' })
      .notNull()
      .$type<{ step: string; title: string; description: string }[]>(),
    includes_ar: text('includes_ar', { mode: 'json' }).notNull().$type<string[]>(),
    includes_en: text('includes_en', { mode: 'json' }).notNull().$type<string[]>(),

    // Advisory & Profile
    suitability_ar: text('suitability_ar').notNull(),
    suitability_en: text('suitability_en').notNull(),
    advisory_ar: text('advisory_ar').notNull(),
    advisory_en: text('advisory_en').notNull(),

    // SEO
    seo_title_ar: text('seo_title_ar').notNull(),
    seo_title_en: text('seo_title_en').notNull(),
    seo_description_ar: text('seo_description_ar').notNull(),
    seo_description_en: text('seo_description_en').notNull(),

    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_services_slug').on(table.slug),
    index('idx_services_category_id').on(table.category_id),
    index('idx_services_published_order').on(table.is_published, table.display_order),
    check('chk_services_price_positive', sql`${table.price_amount_halalas} IS NULL OR ${table.price_amount_halalas} >= 0`),
    check('chk_services_duration_positive', sql`${table.duration_minutes} IS NULL OR ${table.duration_minutes} > 0`),
    check('chk_services_price_confirmed', sql`${table.price_is_confirmed} = 0 OR ${table.price_amount_halalas} IS NOT NULL`),
    check('chk_services_duration_confirmed', sql`${table.duration_is_confirmed} = 0 OR ${table.duration_minutes} IS NOT NULL`),
  ]
);

// 7. OFFERS
export const offers = sqliteTable(
  'offers',
  {
    id: text('id').primaryKey(), // UUID
    slug: text('slug').notNull().unique(),
    image_id: text('image_id').references(() => mediaFiles.id, { onDelete: 'restrict' }),
    badge_ar: text('badge_ar'),
    badge_en: text('badge_en'),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    subtitle_ar: text('subtitle_ar').notNull(),
    subtitle_en: text('subtitle_en').notNull(),
    description_ar: text('description_ar').notNull(),
    description_en: text('description_en').notNull(),
    includes_ar: text('includes_ar', { mode: 'json' }).notNull().$type<string[]>(),
    includes_en: text('includes_en', { mode: 'json' }).notNull().$type<string[]>(),

    // Monetary storage in Saudi halalas
    price_amount_halalas: integer('price_amount_halalas'), // NULL when unconfirmed
    price_currency: text('price_currency').notNull().default('SAR'),
    price_is_confirmed: integer('price_is_confirmed').notNull().default(0),
    price_display_ar: text('price_display_ar').notNull().default('الأسعار عند الاستفسار'),
    price_display_en: text('price_display_en').notNull().default('Price on inquiry'),

    // Duration & Validity
    duration_minutes: integer('duration_minutes'),
    duration_is_confirmed: integer('duration_is_confirmed').notNull().default(0),
    duration_display_ar: text('duration_display_ar').notNull().default('تحدد عند الحجز'),
    duration_display_en: text('duration_display_en').notNull().default('Confirmed upon booking'),
    starts_at: integer('starts_at'),
    expires_at: integer('expires_at'),

    is_featured: integer('is_featured').notNull().default(0),
    is_active: integer('is_active').notNull().default(0),
    display_order: integer('display_order').notNull().default(0),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_offers_active').on(table.is_active, table.display_order),
    check('chk_offers_price_positive', sql`${table.price_amount_halalas} IS NULL OR ${table.price_amount_halalas} >= 0`),
    check('chk_offers_duration_positive', sql`${table.duration_minutes} IS NULL OR ${table.duration_minutes} > 0`),
    check('chk_offers_price_confirmed', sql`${table.price_is_confirmed} = 0 OR ${table.price_amount_halalas} IS NOT NULL`),
    check('chk_offers_duration_confirmed', sql`${table.duration_is_confirmed} = 0 OR ${table.duration_minutes} IS NOT NULL`),
  ]
);

// 8. GALLERY ITEMS
export const galleryItems = sqliteTable(
  'gallery_items',
  {
    id: text('id').primaryKey(), // UUID
    media_id: text('media_id')
      .notNull()
      .references(() => mediaFiles.id, { onDelete: 'restrict' }),
    category: text('category').notNull(), // 'ambiance' | 'treatment' | 'rituals'
    category_label_ar: text('category_label_ar').notNull(),
    category_label_en: text('category_label_en').notNull(),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    alt_ar: text('alt_ar').notNull(),
    alt_en: text('alt_en').notNull(),
    display_order: integer('display_order').notNull().default(0),
    is_published: integer('is_published').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_gallery_category').on(table.category, table.display_order),
  ]
);

// 9. REVIEWS
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(), // UUID
    service_id: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    author_name: text('author_name').notNull(),
    author_title_ar: text('author_title_ar'),
    author_title_en: text('author_title_en'),
    quote_ar: text('quote_ar').notNull(),
    quote_en: text('quote_en').notNull(),
    rating: integer('rating').notNull().default(5),
    is_verified: integer('is_verified').notNull().default(0), // Default 0: unverified until proof provided
    is_approved: integer('is_approved').notNull().default(0), // Default 0: requires explicit admin approval
    display_order: integer('display_order').notNull().default(0),
    review_date: integer('review_date').notNull(),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_reviews_approved').on(table.is_approved, table.display_order),
    check('chk_reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
  ]
);

// 10. BLOG POSTS
export const blogPosts = sqliteTable(
  'blog_posts',
  {
    id: text('id').primaryKey(), // UUID
    slug: text('slug').notNull().unique(),
    featured_image_id: text('featured_image_id').references(() => mediaFiles.id, {
      onDelete: 'restrict',
    }),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    excerpt_ar: text('excerpt_ar').notNull(),
    excerpt_en: text('excerpt_en').notNull(),
    content_ar: text('content_ar').notNull(),
    content_en: text('content_en').notNull(),
    author_name: text('author_name').notNull().default('ALOR SPA'),
    is_published: integer('is_published').notNull().default(0),
    published_at: integer('published_at'),
    seo_title_ar: text('seo_title_ar'),
    seo_title_en: text('seo_title_en'),
    seo_desc_ar: text('seo_desc_ar'),
    seo_desc_en: text('seo_desc_en'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_blog_posts_slug').on(table.slug),
    index('idx_blog_posts_published').on(table.is_published, table.published_at),
  ]
);

// 11. SITE SETTINGS
export const siteSettings = sqliteTable(
  'site_settings',
  {
    key: text('key').primaryKey(), // e.g. 'contact.whatsapp', 'homepage.hero_title'
    value_ar: text('value_ar').notNull().default(''),
    value_en: text('value_en').notNull().default(''),
    value_raw: text('value_raw'), // Canonical non-localized value (e.g. '966553543192')
    group_name: text('group_name').notNull(), // 'contact' | 'social' | 'hours' | 'homepage' | 'about'
    data_type: text('data_type').notNull().default('string'), // 'string' | 'number' | 'boolean' | 'json'
    is_public: integer('is_public').notNull().default(1),
    is_immutable: integer('is_immutable').notNull().default(0), // 1 protects core identity
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_site_settings_group').on(table.group_name, table.is_public),
  ]
);

// 12. ACTIVITY LOGS
export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: text('id').primaryKey(), // UUID
    user_id: text('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
    entity_type: text('entity_type').notNull(), // 'SERVICE' | 'OFFER' | 'GALLERY' | 'REVIEW' | 'SETTINGS'
    entity_id: text('entity_id'),
    old_values: text('old_values', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    new_values: text('new_values', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    created_at: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_activity_logs_created').on(table.created_at),
    index('idx_activity_logs_user').on(table.user_id, table.created_at),
    index('idx_activity_logs_entity').on(table.entity_type, table.entity_id),
  ]
);

// 13. RATE LIMIT RECORDS (Persistent IP Tracking & Key Rotation)
export const rateLimitRecords = sqliteTable(
  'rate_limit_records',
  {
    key: text('key').primaryKey(), // HMAC hash of IP address
    key_version: integer('key_version').notNull().default(1),
    failures: integer('failures').notNull().default(0),
    first_failure_at: integer('first_failure_at'),
    blocked_until: integer('blocked_until'),
    generation: integer('generation').notNull().default(1),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_rate_limit_blocked').on(table.blocked_until),
    index('idx_rate_limit_first_failure').on(table.first_failure_at),
    index('idx_rate_limit_version').on(table.key_version),
    check('chk_rate_limit_failures', sql`${table.failures} >= 0`),
    check('chk_rate_limit_gen', sql`${table.generation} >= 1 AND ${table.generation} <= 9000000000000000`),
    check('chk_rate_limit_version', sql`${table.key_version} >= 1`),
  ]
);

// 14. RATE LIMIT RESERVATIONS (Concurrency & Resource Allocation Leases)
export const rateLimitReservations = sqliteTable(
  'rate_limit_reservations',
  {
    id: text('id').primaryKey(), // UUID
    key: text('key')
      .notNull()
      .references(() => rateLimitRecords.key, { onUpdate: 'cascade', onDelete: 'restrict' }),
    account_id: text('account_id').references(() => adminUsers.id, {
      onUpdate: 'cascade',
      onDelete: 'cascade',
    }),
    snapshot_ip_generation: integer('snapshot_ip_generation').notNull(),
    snapshot_account_generation: integer('snapshot_account_generation'),
    status: text('status').notNull().default('ACTIVE'),
    created_at: integer('created_at').notNull(),
    lease_expires_at: integer('lease_expires_at').notNull(),
    hard_timeout_at: integer('hard_timeout_at').notNull(),
  },
  (table) => [
    index('idx_reservations_key').on(table.key),
    index('idx_reservations_lease').on(table.key, table.lease_expires_at, table.status),
    index('idx_reservations_hard').on(table.hard_timeout_at),
    check('chk_reservations_status', sql`${table.status} = 'ACTIVE'`),
    check('chk_reservations_ip_gen', sql`${table.snapshot_ip_generation} >= 1`),
    check(
      'chk_reservations_acc_gen',
      sql`${table.snapshot_account_generation} IS NULL OR ${table.snapshot_account_generation} >= 1`
    ),
    check(
      'chk_reservations_times',
      sql`${table.hard_timeout_at} >= ${table.lease_expires_at} AND ${table.lease_expires_at} >= ${table.created_at}`
    ),
  ]
);

// 15. MASSAGE TYPES (Official Massage Menu Catalog)
export const massageTypes = sqliteTable(
  'massage_types',
  {
    id: text('id').primaryKey(), // e.g. 'msg_relaxing', 'msg_therapeutic', 'msg_deep_tissue', etc.
    slug: text('slug').notNull().unique(),
    service_id: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    subtitle_ar: text('subtitle_ar').notNull().default(''),
    subtitle_en: text('subtitle_en').notNull().default(''),
    description_ar: text('description_ar').notNull(),
    description_en: text('description_en').notNull(),
    display_order: integer('display_order').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_massage_types_slug').on(table.slug),
    index('idx_massage_types_order').on(table.is_active, table.display_order),
  ]
);

// 16. SERVICE VARIANTS (Multiple Durations & Pricing per Massage Type / Service)
export const serviceVariants = sqliteTable(
  'service_variants',
  {
    id: text('id').primaryKey(), // e.g. 'var_relax_60', 'var_relax_90', 'var_relax_120'
    massage_type_id: text('massage_type_id')
      .notNull()
      .references(() => massageTypes.id, { onDelete: 'cascade' }),
    service_id: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    slug: text('slug').notNull().unique(),
    duration_minutes: integer('duration_minutes').notNull(), // 60, 90, 120
    duration_display_ar: text('duration_display_ar').notNull(), // '60 دقيقة'
    duration_display_en: text('duration_display_en').notNull(), // '60 Minutes'
    price_amount_halalas: integer('price_amount_halalas').notNull(), // e.g. 17500 for 175 SAR
    price_currency: text('price_currency').notNull().default('SAR'),
    price_display_ar: text('price_display_ar').notNull(), // '175 ر.س'
    price_display_en: text('price_display_en').notNull(), // '175 SAR'
    display_order: integer('display_order').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_service_variants_massage_type').on(table.massage_type_id, table.display_order),
    index('idx_service_variants_duration').on(table.duration_minutes),
    check('chk_service_variants_price', sql`${table.price_amount_halalas} >= 0`),
    check('chk_service_variants_duration', sql`${table.duration_minutes} > 0`),
  ]
);

// 17. PACKAGES (Standard Packages & Special Experiences)
export const packages = sqliteTable(
  'packages',
  {
    id: text('id').primaryKey(), // e.g. 'pkg_relax_pedi_mani', 'pkg_special_diamond'
    slug: text('slug').notNull().unique(),
    package_type: text('package_type').notNull().default('standard'), // 'standard' | 'special'
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    subtitle_ar: text('subtitle_ar').notNull().default(''),
    subtitle_en: text('subtitle_en').notNull().default(''),
    description_ar: text('description_ar').notNull(),
    description_en: text('description_en').notNull(),
    includes_ar: text('includes_ar', { mode: 'json' }).notNull().$type<string[]>(),
    includes_en: text('includes_en', { mode: 'json' }).notNull().$type<string[]>(),
    price_amount_halalas: integer('price_amount_halalas'), // NULL when package has multiple distinct options
    price_currency: text('price_currency').notNull().default('SAR'),
    price_display_ar: text('price_display_ar').notNull(), // '296 ر.س' or 'تبدأ من 259 ر.س'
    price_display_en: text('price_display_en').notNull(), // '296 SAR' or 'From 259 SAR'
    badge_ar: text('badge_ar'),
    badge_en: text('badge_en'),
    image_id: text('image_id').references(() => mediaFiles.id, { onDelete: 'set null' }),
    display_order: integer('display_order').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_packages_slug').on(table.slug),
    index('idx_packages_type_order').on(table.package_type, table.is_active, table.display_order),
    check('chk_packages_price', sql`${table.price_amount_halalas} IS NULL OR ${table.price_amount_halalas} >= 0`),
  ]
);

// 18. PACKAGE OPTIONS (Separate Multi-Option Choices like Friends Package)
export const packageOptions = sqliteTable(
  'package_options',
  {
    id: text('id').primaryKey(), // e.g. 'opt_friends_hammam', 'opt_friends_pedi', 'opt_friends_relax'
    package_id: text('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    title_ar: text('title_ar').notNull(),
    title_en: text('title_en').notNull(),
    description_ar: text('description_ar'),
    description_en: text('description_en'),
    price_amount_halalas: integer('price_amount_halalas').notNull(),
    price_currency: text('price_currency').notNull().default('SAR'),
    price_display_ar: text('price_display_ar').notNull(), // '259 ر.س'
    price_display_en: text('price_display_en').notNull(), // '259 SAR'
    display_order: integer('display_order').notNull().default(0),
    is_active: integer('is_active').notNull().default(1),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_package_options_pkg').on(table.package_id, table.display_order),
    check('chk_package_options_price', sql`${table.price_amount_halalas} >= 0`),
  ]
);

// 19. BOOKING REQUESTS (Client Bookings & Contact Inquiries)
export const bookingRequests = sqliteTable(
  'booking_requests',
  {
    id: text('id').primaryKey(), // UUID
    request_number: text('request_number').notNull().unique(), // e.g. 'ALOR-BK-2026-4821'
    client_name: text('client_name').notNull(),
    client_phone: text('client_phone').notNull(),
    service_id: text('service_id').references(() => services.id, { onDelete: 'set null' }),
    service_name: text('service_name').notNull(),
    preferred_date: text('preferred_date').notNull(),
    preferred_time: text('preferred_time').notNull(),
    notes: text('notes'),
    status: text('status').notNull().default('new'), // 'new' | 'following_up' | 'contacted' | 'confirmed' | 'cancelled'
    admin_notes: text('admin_notes'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_booking_requests_status_created').on(table.status, table.created_at),
    index('idx_booking_requests_date').on(table.preferred_date),
    index('idx_booking_requests_phone').on(table.client_phone),
    check(
      'chk_booking_requests_status',
      sql`${table.status} IN ('new', 'following_up', 'contacted', 'confirmed', 'cancelled')`
    ),
  ]
);

/**
 * ============================================================================
 * RELATIONS DEFINITIONS (Type-safe relational queries)
 * ============================================================================
 */

export const adminRolesRelations = relations(adminRoles, ({ many }) => ({
  users: many(adminUsers),
}));

export const adminUsersRelations = relations(adminUsers, ({ one, many }) => ({
  role: one(adminRoles, {
    fields: [adminUsers.role_id],
    references: [adminRoles.id],
  }),
  sessions: many(adminSessions),
  uploadedMedia: many(mediaFiles),
  activityLogs: many(activityLogs),
  rateLimitReservations: many(rateLimitReservations),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminSessions.user_id],
    references: [adminUsers.id],
  }),
}));

export const rateLimitRecordsRelations = relations(rateLimitRecords, ({ many }) => ({
  reservations: many(rateLimitReservations),
}));

export const rateLimitReservationsRelations = relations(rateLimitReservations, ({ one }) => ({
  record: one(rateLimitRecords, {
    fields: [rateLimitReservations.key],
    references: [rateLimitRecords.key],
  }),
  account: one(adminUsers, {
    fields: [rateLimitReservations.account_id],
    references: [adminUsers.id],
  }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one, many }) => ({
  uploader: one(adminUsers, {
    fields: [mediaFiles.uploaded_by],
    references: [adminUsers.id],
  }),
  services: many(services),
  offers: many(offers),
  packages: many(packages),
  galleryItems: many(galleryItems),
  blogPosts: many(blogPosts),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.category_id],
    references: [serviceCategories.id],
  }),
  featuredImage: one(mediaFiles, {
    fields: [services.featured_image_id],
    references: [mediaFiles.id],
  }),
  reviews: many(reviews),
  massageTypes: many(massageTypes),
  variants: many(serviceVariants),
}));

export const massageTypesRelations = relations(massageTypes, ({ one, many }) => ({
  service: one(services, {
    fields: [massageTypes.service_id],
    references: [services.id],
  }),
  variants: many(serviceVariants),
}));

export const serviceVariantsRelations = relations(serviceVariants, ({ one }) => ({
  massageType: one(massageTypes, {
    fields: [serviceVariants.massage_type_id],
    references: [massageTypes.id],
  }),
  service: one(services, {
    fields: [serviceVariants.service_id],
    references: [services.id],
  }),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  image: one(mediaFiles, {
    fields: [packages.image_id],
    references: [mediaFiles.id],
  }),
  options: many(packageOptions),
}));

export const packageOptionsRelations = relations(packageOptions, ({ one }) => ({
  package: one(packages, {
    fields: [packageOptions.package_id],
    references: [packages.id],
  }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  image: one(mediaFiles, {
    fields: [offers.image_id],
    references: [mediaFiles.id],
  }),
}));

export const galleryItemsRelations = relations(galleryItems, ({ one }) => ({
  media: one(mediaFiles, {
    fields: [galleryItems.media_id],
    references: [mediaFiles.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  service: one(services, {
    fields: [reviews.service_id],
    references: [services.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  featuredImage: one(mediaFiles, {
    fields: [blogPosts.featured_image_id],
    references: [mediaFiles.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(adminUsers, {
    fields: [activityLogs.user_id],
    references: [adminUsers.id],
  }),
}));

export const bookingRequestsRelations = relations(bookingRequests, ({ one }) => ({
  service: one(services, {
    fields: [bookingRequests.service_id],
    references: [services.id],
  }),
}));
