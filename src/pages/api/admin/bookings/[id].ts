import type { APIRoute } from 'astro';
import { hasPermission } from '../../../../server/auth/rbac';
import { bookingRequestUpdateSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single booking request
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || (!hasPermission(user, 'services:read') && !hasPermission(user, 'reviews:read'))) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute({
    sql: 'SELECT * FROM booking_requests WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'طلب الحجز غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update booking request status / notes
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || (!hasPermission(user, 'services:read') && !hasPermission(user, 'reviews:approve'))) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل طلبات الحجز' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM booking_requests WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'طلب الحجز غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = bookingRequestUpdateSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE booking_requests SET
        status = ?, admin_notes = ?, updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.status,
        parsed.admin_notes ?? (oldValues.admin_notes as string | null),
        now,
        id,
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'BOOKING_REQUEST' as any,
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث حالة طلب الحجز بنجاح' }), {
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

// DELETE booking request
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:create')) { // Only managers/superadmins can delete
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف طلبات الحجز' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM booking_requests WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'طلب الحجز غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM booking_requests WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'BOOKING_REQUEST' as any,
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف طلب الحجز بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
