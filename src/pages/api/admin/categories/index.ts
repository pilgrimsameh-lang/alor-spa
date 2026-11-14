import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { categoryInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET list of categories
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute(`
    SELECT c.*, (SELECT COUNT(*) FROM services WHERE category_id = c.id) as services_count
    FROM service_categories c
    ORDER BY c.display_order ASC;
  `);

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create category
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بإضافة تصنيفات جديدة' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = categoryInputSchema.parse(rawBody);
    const { client } = getDb();

    // Check slug uniqueness
    const slugCheck = await client.execute({
      sql: 'SELECT id FROM service_categories WHERE slug = ?;',
      args: [parsed.slug],
    });
    if (slugCheck.rows.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'الرابط الفريد (Slug) مستخدم بالفعل' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parsed.id || `cat_${parsed.slug.replace(/[^a-z0-9]/g, '_')}`;

    await client.execute({
      sql: `INSERT INTO service_categories (id, slug, title_ar, title_en, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?);`,
      args: [id, parsed.slug, parsed.title_ar, parsed.title_en, parsed.display_order, parsed.is_active],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'CATEGORY',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم إضافة التصنيف بنجاح' }), {
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
