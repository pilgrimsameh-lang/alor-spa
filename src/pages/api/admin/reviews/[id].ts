import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { reviewInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single review
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'reviews:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute({
    sql: 'SELECT * FROM reviews WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المراجعة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update review (approve / edit)
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'reviews:approve')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل أو اعتماد المراجعات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  const existingRes = await client.execute({
    sql: 'SELECT * FROM reviews WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المراجعة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = reviewInputSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE reviews SET
        service_id = ?, author_name = ?, author_title_ar = ?, author_title_en = ?,
        quote_ar = ?, quote_en = ?, rating = ?, is_verified = ?, is_approved = ?,
        display_order = ?, updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.service_id ?? null, parsed.author_name, parsed.author_title_ar ?? null, parsed.author_title_en ?? null,
        parsed.quote_ar, parsed.quote_en, parsed.rating, parsed.is_verified, parsed.is_approved,
        parsed.display_order, now, id
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'REVIEW',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث المراجعة بنجاح' }), {
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

// DELETE review
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'reviews:approve')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف المراجعات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  const existingRes = await client.execute({
    sql: 'SELECT * FROM reviews WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المراجعة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM reviews WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'REVIEW',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف المراجعة بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
