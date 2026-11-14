import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { hasPermission } from '../../../../server/auth/rbac';
import { galleryInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET list gallery items
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'gallery:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute(`
    SELECT g.*, m.public_url, m.filename, m.mime_type
    FROM gallery_items g
    LEFT JOIN media_files m ON g.media_id = m.id
    ORDER BY g.display_order ASC;
  `);

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create gallery item
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'gallery:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بإضافة صور للمعرض' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = galleryInputSchema.parse(rawBody);
    const client = locals.dbClient!;

    // Verify media file exists
    const mediaCheck = await client.execute({
      sql: 'SELECT id FROM media_files WHERE id = ?;',
      args: [parsed.media_id],
    });
    if (mediaCheck.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'ملف الوسائط المحدد غير موجود' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parsed.id || crypto.randomUUID();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO gallery_items (
        id, media_id, category, category_label_ar, category_label_en,
        title_ar, title_en, alt_ar, alt_en, display_order, is_published,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id, parsed.media_id, parsed.category, parsed.category_label_ar, parsed.category_label_en,
        parsed.title_ar, parsed.title_en, parsed.alt_ar, parsed.alt_en, parsed.display_order, parsed.is_published,
        now, now
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'GALLERY',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم إضافة الصورة إلى المعرض بنجاح' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'خطأ في معالجة الطلب' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
