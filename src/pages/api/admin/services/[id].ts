import type { APIRoute } from 'astro';
import { hasPermission } from '../../../../server/auth/rbac';
import { serviceInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single service
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute({
    sql: 'SELECT * FROM services WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'الخدمة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update service
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل الخدمات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM services WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'الخدمة المراد تعديلها غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = serviceInputSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE services SET
        category_id = ?, featured_image_id = ?, slug = ?,
        title_ar = ?, title_en = ?, subtitle_ar = ?, subtitle_en = ?,
        description_ar = ?, description_en = ?,
        is_signature = ?, is_published = ?, display_order = ?,
        price_amount_halalas = ?, price_currency = ?, price_is_confirmed = ?, price_display_ar = ?, price_display_en = ?,
        duration_minutes = ?, duration_is_confirmed = ?, duration_display_ar = ?, duration_display_en = ?,
        seo_title_ar = ?, seo_title_en = ?, seo_description_ar = ?, seo_description_en = ?,
        updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.category_id, parsed.featured_image_id ?? null, parsed.slug,
        parsed.title_ar, parsed.title_en, parsed.subtitle_ar, parsed.subtitle_en,
        parsed.description_ar, parsed.description_en,
        parsed.is_signature, parsed.is_published, parsed.display_order,
        parsed.price_amount_halalas ?? null, parsed.price_currency, parsed.price_is_confirmed, parsed.price_display_ar, parsed.price_display_en,
        parsed.duration_minutes ?? null, parsed.duration_is_confirmed, parsed.duration_display_ar, parsed.duration_display_en,
        parsed.seo_title_ar, parsed.seo_title_en, parsed.seo_description_ar, parsed.seo_description_en,
        now, id
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'SERVICE',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث بيانات الخدمة بنجاح' }), {
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

// DELETE service
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف الخدمات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM services WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'الخدمة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM services WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'SERVICE',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف الخدمة بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
