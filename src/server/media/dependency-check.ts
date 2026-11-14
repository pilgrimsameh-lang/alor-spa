import type { DatabaseClient } from '../db/index';

/**
 * ============================================================================
 * ALOR SPA — Media Dependency & Referential Safety Checker
 * Checks all relations across services, offers, gallery, and blog posts
 * ============================================================================
 */

export interface MediaReference {
  type: 'SERVICE' | 'OFFER' | 'GALLERY' | 'BLOG';
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface MediaUsageResult {
  isInUse: boolean;
  references: MediaReference[];
  summaryMessageAr: string;
  summaryMessageEn: string;
}

export async function checkMediaUsage(client: DatabaseClient, mediaId: string): Promise<MediaUsageResult> {
  const references: MediaReference[] = [];

  // 1. Check services
  const servicesCheck = await client.execute({
    sql: 'SELECT id, title_ar, title_en FROM services WHERE featured_image_id = ?;',
    args: [mediaId],
  });
  for (const row of servicesCheck.rows) {
    references.push({
      type: 'SERVICE',
      id: String(row.id),
      nameAr: String(row.title_ar || row.id),
      nameEn: String(row.title_en || row.id),
    });
  }

  // 2. Check offers
  const offersCheck = await client.execute({
    sql: 'SELECT id, title_ar, title_en FROM offers WHERE image_id = ?;',
    args: [mediaId],
  });
  for (const row of offersCheck.rows) {
    references.push({
      type: 'OFFER',
      id: String(row.id),
      nameAr: String(row.title_ar || row.id),
      nameEn: String(row.title_en || row.id),
    });
  }

  // 3. Check gallery items
  const galleryCheck = await client.execute({
    sql: 'SELECT id, title_ar, title_en FROM gallery_items WHERE media_id = ?;',
    args: [mediaId],
  });
  for (const row of galleryCheck.rows) {
    references.push({
      type: 'GALLERY',
      id: String(row.id),
      nameAr: String(row.title_ar || row.id),
      nameEn: String(row.title_en || row.id),
    });
  }

  // 4. Check blog posts (featured_image_id)
  const blogCheck = await client.execute({
    sql: 'SELECT id, title_ar, title_en FROM blog_posts WHERE featured_image_id = ?;',
    args: [mediaId],
  });
  for (const row of blogCheck.rows) {
    references.push({
      type: 'BLOG',
      id: String(row.id),
      nameAr: String(row.title_ar || row.id),
      nameEn: String(row.title_en || row.id),
    });
  }

  const isInUse = references.length > 0;
  const summaryMessageAr = isInUse
    ? `الملف مرتبط حالياً بـ (${references.length}) عناصر في النظام (خدمات، عروض، أو مقالات). يجب فك الارتباط أولاً قبل الحذف.`
    : 'الملف غير مستخدم في أي محتوى ويمكن حذفه بأمان.';

  const summaryMessageEn = isInUse
    ? `This media file is currently linked to (${references.length}) items. Unlink them before deletion.`
    : 'Media is not currently used and can be safely deleted.';

  return {
    isInUse,
    references,
    summaryMessageAr,
    summaryMessageEn,
  };
}
