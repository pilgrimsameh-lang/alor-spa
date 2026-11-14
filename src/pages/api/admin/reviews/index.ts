import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { reviewInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET list reviews
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'reviews:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute(`
    SELECT r.*, s.title_ar as service_title_ar, s.title_en as service_title_en
    FROM reviews r
    LEFT JOIN services s ON r.service_id = s.id
    ORDER BY r.created_at DESC;
  `);

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create review
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (!hasPermission(user, 'reviews:approve') && !hasPermission(user, 'reviews:read'))) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بإضافة مراجعات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = reviewInputSchema.parse(rawBody);
    const { client } = getDb();

    const id = parsed.id || crypto.randomUUID();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO reviews (
        id, service_id, author_name, author_title_ar, author_title_en,
        quote_ar, quote_en, rating, is_verified, is_approved, display_order, review_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id, parsed.service_id ?? null, parsed.author_name, parsed.author_title_ar ?? null, parsed.author_title_en ?? null,
        parsed.quote_ar, parsed.quote_en, parsed.rating, parsed.is_verified, parsed.is_approved, parsed.display_order,
        parsed.review_date, now, now
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'REVIEW',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم إضافة المراجعة بنجاح' }), {
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
