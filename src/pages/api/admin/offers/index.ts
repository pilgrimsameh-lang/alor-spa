import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { hasPermission } from '../../../../server/auth/rbac';
import { offerInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET list of offers
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'offers:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute('SELECT * FROM offers ORDER BY display_order ASC;');

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create offer
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'offers:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بإضافة عروض جديدة' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = offerInputSchema.parse(rawBody);
    const client = locals.dbClient!;

    // Check slug uniqueness
    const slugCheck = await client.execute({
      sql: 'SELECT id FROM offers WHERE slug = ?;',
      args: [parsed.slug],
    });
    if (slugCheck.rows.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'الرابط الفريد (Slug) مستخدم بالفعل' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parsed.id || crypto.randomUUID();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO offers (
        id, slug, image_id, badge_ar, badge_en,
        title_ar, title_en, subtitle_ar, subtitle_en,
        description_ar, description_en, includes_ar, includes_en,
        price_amount_halalas, price_currency, price_is_confirmed, price_display_ar, price_display_en,
        duration_minutes, duration_is_confirmed, duration_display_ar, duration_display_en,
        starts_at, expires_at, is_featured, is_active, display_order,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      );`,
      args: [
        id, parsed.slug, parsed.image_id ?? null, parsed.badge_ar ?? null, parsed.badge_en ?? null,
        parsed.title_ar, parsed.title_en, parsed.subtitle_ar, parsed.subtitle_en,
        parsed.description_ar, parsed.description_en, JSON.stringify(parsed.includes_ar), JSON.stringify(parsed.includes_en),
        parsed.price_amount_halalas ?? null, parsed.price_currency, parsed.price_is_confirmed, parsed.price_display_ar, parsed.price_display_en,
        parsed.duration_minutes ?? null, parsed.duration_is_confirmed, parsed.duration_display_ar, parsed.duration_display_en,
        parsed.starts_at ?? null, parsed.expires_at ?? null, parsed.is_featured, parsed.is_active, parsed.display_order,
        now, now
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'OFFER',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم إضافة العرض بنجاح' }), {
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
