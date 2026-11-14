import type { Client } from '@libsql/client';

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

export async function checkMediaUsage(client: Client, mediaId: string): Promise<MediaUsageResult> {
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

  // 4. Check blog posts
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
  let summaryMessageAr = '';
  let summaryMessageEn = '';

  if (isInUse) {
    const listAr = references.map((r) => `${r.type}: ${r.nameAr}`).join('، ');
    const listEn = references.map((r) => `${r.type}: ${r.nameEn}`).join(', ');
    summaryMessageAr = `لا يمكن حذف هذه الصورة لأنها مرتبطة بالمحتوى التالي: ${listAr}`;
    summaryMessageEn = `Cannot delete this image because it is referenced in: ${listEn}`;
  }

  return {
    isInUse,
    references,
    summaryMessageAr,
    summaryMessageEn,
  };
}
