import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { offerInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single offer
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'offers:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute({
    sql: 'SELECT * FROM offers WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'العرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update offer
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'offers:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل العروض' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  const existingRes = await client.execute({
    sql: 'SELECT * FROM offers WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'العرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = offerInputSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE offers SET
        slug = ?, image_id = ?, badge_ar = ?, badge_en = ?,
        title_ar = ?, title_en = ?, subtitle_ar = ?, subtitle_en = ?,
        description_ar = ?, description_en = ?, includes_ar = ?, includes_en = ?,
        price_amount_halalas = ?, price_currency = ?, price_is_confirmed = ?, price_display_ar = ?, price_display_en = ?,
        duration_minutes = ?, duration_is_confirmed = ?, duration_display_ar = ?, duration_display_en = ?,
        starts_at = ?, expires_at = ?, is_featured = ?, is_active = ?, display_order = ?,
        updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.slug, parsed.image_id ?? null, parsed.badge_ar ?? null, parsed.badge_en ?? null,
        parsed.title_ar, parsed.title_en, parsed.subtitle_ar, parsed.subtitle_en,
        parsed.description_ar, parsed.description_en, JSON.stringify(parsed.includes_ar), JSON.stringify(parsed.includes_en),
        parsed.price_amount_halalas ?? null, parsed.price_currency, parsed.price_is_confirmed, parsed.price_display_ar, parsed.price_display_en,
        parsed.duration_minutes ?? null, parsed.duration_is_confirmed, parsed.duration_display_ar, parsed.duration_display_en,
        parsed.starts_at ?? null, parsed.expires_at ?? null, parsed.is_featured, parsed.is_active, parsed.display_order,
        now, id
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'OFFER',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث العرض بنجاح' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'فشل التحديث' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE offer
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'offers:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف العروض' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  const existingRes = await client.execute({
    sql: 'SELECT * FROM offers WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'العرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM offers WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'OFFER',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف العرض بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
