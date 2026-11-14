import { z } from 'zod';

/**
 * ============================================================================
 * ALOR SPA — Server-Side Zod Validation Schemas for Admin CRUD Operations
 * Strict type enforcement, bilingual string sanitation, and monetary integrity
 * ============================================================================
 */

// 1. SERVICES VALIDATION SCHEMA
export const serviceInputSchema = z.object({
  id: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'المعرف يجب أن يتكون من حروف إنجليزية صغيرة وأرقام وشرطات فقط').optional(),
  category_id: z.string().min(1, 'تصنيف الخدمة مطلوب'),
  featured_image_id: z.string().nullable().optional(),
  slug: z.string().min(2, 'الرابط الفريد (Slug) مطلوب').max(100).regex(/^[a-z0-9-]+$/, 'Slug يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات'),
  title_ar: z.string().min(2, 'اسم الخدمة بالعربية مطلوب').max(200),
  title_en: z.string().min(2, 'اسم الخدمة بالإنجليزية مطلوب').max(200),
  subtitle_ar: z.string().default(''),
  subtitle_en: z.string().default(''),
  description_ar: z.string().min(5, 'الوصف العربي مطلوب'),
  description_en: z.string().min(5, 'الوصف الإنجليزي مطلوب'),
  is_signature: z.coerce.number().int().min(0).max(1).default(0),
  is_published: z.coerce.number().int().min(0).max(1).default(1),
  display_order: z.coerce.number().int().default(0),
  // Monetary storage in Saudi Halalas (1 SAR = 100 Halalas)
  price_amount_halalas: z.coerce.number().int().min(0).nullable().optional(),
  price_currency: z.string().default('SAR'),
  price_is_confirmed: z.coerce.number().int().min(0).max(1).default(0),
  price_display_ar: z.string().default('الأسعار عند الاستفسار'),
  price_display_en: z.string().default('Price on inquiry'),
  // Duration
  duration_minutes: z.coerce.number().int().min(1).nullable().optional(),
  duration_is_confirmed: z.coerce.number().int().min(0).max(1).default(0),
  duration_display_ar: z.string().default('تحدد عند الحجز'),
  duration_display_en: z.string().default('Confirmed upon booking'),
  // SEO
  seo_title_ar: z.string().default(''),
  seo_title_en: z.string().default(''),
  seo_description_ar: z.string().default(''),
  seo_description_en: z.string().default(''),
  // Bilingual Arrays (Optional with safe defaults)
  detailed_description_ar: z.array(z.string()).default([]),
  detailed_description_en: z.array(z.string()).default([]),
  features_ar: z.array(z.string()).default([]),
  features_en: z.array(z.string()).default([]),
  benefits_ar: z.array(z.string()).default([]),
  benefits_en: z.array(z.string()).default([]),
  steps_ar: z.array(z.object({ step: z.string(), title: z.string(), description: z.string() })).default([]),
  steps_en: z.array(z.object({ step: z.string(), title: z.string(), description: z.string() })).default([]),
  includes_ar: z.array(z.string()).default([]),
  includes_en: z.array(z.string()).default([]),
  suitability_ar: z.string().default(''),
  suitability_en: z.string().default(''),
  advisory_ar: z.string().default(''),
  advisory_en: z.string().default(''),
});

// 2. CATEGORIES VALIDATION SCHEMA
export const categoryInputSchema = z.object({
  id: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/, 'المعرف يجب أن يتكون من أحرف إنجليزية وأرقام وشرطات').optional(),
  slug: z.string().min(2, 'الرابط الفريد (Slug) مطلوب').max(50).regex(/^[a-z0-9-]+$/, 'Slug غير صالح'),
  title_ar: z.string().min(2, 'عنوان التصنيف بالعربية مطلوب').max(100),
  title_en: z.string().min(2, 'عنوان التصنيف بالإنجليزية مطلوب').max(100),
  display_order: z.coerce.number().int().default(0),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
});

// 3. OFFERS VALIDATION SCHEMA
export const offerInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2, 'الرابط الفريد (Slug) مطلوب').max(100).regex(/^[a-z0-9-]+$/, 'Slug غير صالح'),
  image_id: z.string().nullable().optional(),
  badge_ar: z.string().nullable().optional(),
  badge_en: z.string().nullable().optional(),
  title_ar: z.string().min(2, 'عنوان العرض بالعربية مطلوب').max(200),
  title_en: z.string().min(2, 'عنوان العرض بالإنجليزية مطلوب').max(200),
  subtitle_ar: z.string().default(''),
  subtitle_en: z.string().default(''),
  description_ar: z.string().min(5, 'تفاصيل العرض بالعربية مطلوبة'),
  description_en: z.string().min(5, 'تفاصيل العرض بالإنجليزية مطلوبة'),
  includes_ar: z.array(z.string()).default([]),
  includes_en: z.array(z.string()).default([]),
  // Pricing in Halalas
  price_amount_halalas: z.coerce.number().int().min(0).nullable().optional(),
  price_currency: z.string().default('SAR'),
  price_is_confirmed: z.coerce.number().int().min(0).max(1).default(0),
  price_display_ar: z.string().default('الأسعار عند الاستفسار'),
  price_display_en: z.string().default('Price on inquiry'),
  // Duration & Validity
  duration_minutes: z.coerce.number().int().min(1).nullable().optional(),
  duration_is_confirmed: z.coerce.number().int().min(0).max(1).default(0),
  duration_display_ar: z.string().default('تحدد عند الحجز'),
  duration_display_en: z.string().default('Confirmed upon booking'),
  starts_at: z.coerce.number().int().nullable().optional(),
  expires_at: z.coerce.number().int().nullable().optional(),
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  display_order: z.coerce.number().int().default(0),
});

// 4. GALLERY ITEMS VALIDATION SCHEMA
export const galleryInputSchema = z.object({
  id: z.string().optional(),
  media_id: z.string().min(1, 'الصورة مطلوبة'),
  category: z.string().min(1, 'فئة الصورة مطلوبة'),
  category_label_ar: z.string().min(1, 'اسم الفئة بالعربية مطلوب'),
  category_label_en: z.string().min(1, 'اسم الفئة بالإنجليزية مطلوب'),
  title_ar: z.string().min(2, 'عنوان الصورة بالعربية مطلوب'),
  title_en: z.string().min(2, 'عنوان الصورة بالإنجليزية مطلوب'),
  alt_ar: z.string().default(''),
  alt_en: z.string().default(''),
  display_order: z.coerce.number().int().default(0),
  is_published: z.coerce.number().int().min(0).max(1).default(1),
});

// 5. REVIEWS VALIDATION SCHEMA
export const reviewInputSchema = z.object({
  id: z.string().optional(),
  service_id: z.string().nullable().optional(),
  author_name: z.string().min(2, 'اسم صاحبة التقييم مطلوب').max(100),
  author_title_ar: z.string().nullable().optional(),
  author_title_en: z.string().nullable().optional(),
  quote_ar: z.string().min(5, 'نص التجربة بالعربية مطلوب'),
  quote_en: z.string().min(5, 'نص التجربة بالإنجليزية مطلوب'),
  rating: z.coerce.number().int().min(1).max(5, 'التقييم يجب أن يكون بين 1 و 5'),
  is_verified: z.coerce.number().int().min(0).max(1).default(0),
  is_approved: z.coerce.number().int().min(-1).max(1).default(0),
  display_order: z.coerce.number().int().default(0),
  review_date: z.coerce.number().int().default(() => Date.now()),
});

// 6. BLOG POSTS VALIDATION SCHEMA
export const blogPostInputSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2, 'الرابط الفريد (Slug) مطلوب').max(150).regex(/^[a-z0-9-]+$/, 'Slug غير صالح'),
  featured_image_id: z.string().nullable().optional(),
  title_ar: z.string().min(3, 'عنوان المقال بالعربية مطلوب').max(250),
  title_en: z.string().min(3, 'عنوان المقال بالإنجليزية مطلوب').max(250),
  excerpt_ar: z.string().min(5, 'موجز المقال بالعربية مطلوب'),
  excerpt_en: z.string().min(5, 'موجز المقال بالإنجليزية مطلوب'),
  content_ar: z.string().min(10, 'محتوى المقال بالعربية مطلوب'),
  content_en: z.string().min(10, 'محتوى المقال بالإنجليزية مطلوب'),
  author_name: z.string().default('ALOR SPA'),
  is_published: z.coerce.number().int().min(0).max(1).default(0),
  published_at: z.coerce.number().int().nullable().optional(),
  seo_title_ar: z.string().nullable().optional(),
  seo_title_en: z.string().nullable().optional(),
  seo_desc_ar: z.string().nullable().optional(),
  seo_desc_en: z.string().nullable().optional(),
});

// 7. SITE SETTINGS VALIDATION SCHEMA
export const siteSettingInputSchema = z.object({
  key: z.string().min(1),
  value_ar: z.string().default(''),
  value_en: z.string().default(''),
  value_raw: z.string().nullable().optional(),
});

// 8. MEDIA UPDATE VALIDATION SCHEMA
export const mediaUpdateSchema = z.object({
  alt_ar: z.string().max(300, 'النص البديل بالعربية يجب ألا يتجاوز 300 حرف').default(''),
  alt_en: z.string().max(300, 'النص البديل بالإنجليزية يجب ألا يتجاوز 300 حرف').default(''),
  title_ar: z.string().max(200, 'العنوان بالعربية يجب ألا يتجاوز 200 حرف').nullable().optional(),
  title_en: z.string().max(200, 'العنوان بالإنجليزية يجب ألا يتجاوز 200 حرف').nullable().optional(),
});

// 9. BOOKING REQUEST VALIDATION SCHEMA
export const bookingRequestInputSchema = z.object({
  client_name: z.string().min(2, 'يرجى كتابة الاسم بشكل صحيح (حرفين على الأقل)').max(100),
  client_phone: z.string().min(8, 'يرجى إدخال رقم جوال صحيح').max(20),
  service_id: z.string().nullable().optional(),
  service_name: z.string().min(2, 'يرجى اختيار الخدمة المطلوبة').max(150),
  preferred_date: z.string().min(4, 'يرجى تحديد التاريخ المفضل'),
  preferred_time: z.string().min(2, 'يرجى تحديد الوقت المفضل'),
  notes: z.string().max(1000).optional().nullable(),
});

export const bookingRequestUpdateSchema = z.object({
  status: z.enum(['new', 'following_up', 'contacted', 'confirmed', 'cancelled']),
  admin_notes: z.string().max(2000).optional().nullable(),
});
