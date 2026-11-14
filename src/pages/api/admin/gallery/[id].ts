import type { APIRoute } from 'astro';
import { hasPermission } from '../../../../server/auth/rbac';
import { galleryInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single gallery item
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'gallery:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute({
    sql: 'SELECT * FROM gallery_items WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'عنصر المعرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update gallery item
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'gallery:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل عناصر المعرض' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM gallery_items WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'عنصر المعرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = galleryInputSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE gallery_items SET
        media_id = ?, category = ?, category_label_ar = ?, category_label_en = ?,
        title_ar = ?, title_en = ?, alt_ar = ?, alt_en = ?, display_order = ?, is_published = ?,
        updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.media_id, parsed.category, parsed.category_label_ar, parsed.category_label_en,
        parsed.title_ar, parsed.title_en, parsed.alt_ar, parsed.alt_en, parsed.display_order, parsed.is_published,
        now, id
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'GALLERY',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث بيانات المعرض بنجاح' }), {
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

// DELETE gallery item
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'gallery:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف عناصر المعرض' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM gallery_items WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'عنصر المعرض غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM gallery_items WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'GALLERY',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف الصورة من المعرض بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
