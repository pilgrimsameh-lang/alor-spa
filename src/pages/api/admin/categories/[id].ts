import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { categoryInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// PUT update category
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل التصنيفات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  const existingRes = await client.execute({
    sql: 'SELECT * FROM service_categories WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'التصنيف غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = categoryInputSchema.parse(rawBody);

    await client.execute({
      sql: `UPDATE service_categories SET
        slug = ?, title_ar = ?, title_en = ?, display_order = ?, is_active = ?
      WHERE id = ?;`,
      args: [parsed.slug, parsed.title_ar, parsed.title_en, parsed.display_order, parsed.is_active, id],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'CATEGORY',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث التصنيف بنجاح' }), {
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

// DELETE category with Foreign Key relation protection
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف التصنيفات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const { client } = getDb();

  // Check if any service is linked to this category
  const servicesLinked = await client.execute({
    sql: 'SELECT COUNT(*) as c FROM services WHERE category_id = ?;',
    args: [id],
  });

  if (Number(servicesLinked.rows[0]?.c) > 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `لا يمكن حذف هذا التصنيف لأنه مرتبط بـ (${servicesLinked.rows[0].c}) من الخدمات المسجلة. يرجى نقل الخدمات أولاً.`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const existingRes = await client.execute({
    sql: 'SELECT * FROM service_categories WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'التصنيف غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM service_categories WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'CATEGORY',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف التصنيف بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
