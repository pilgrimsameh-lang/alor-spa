import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { serviceInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET: List all services
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك باستعراض الخدمات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute(`
    SELECT s.*, c.title_ar as category_title_ar, c.title_en as category_title_en
    FROM services s
    LEFT JOIN service_categories c ON s.category_id = c.id
    ORDER BY s.display_order ASC;
  `);

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Create a new service
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'services:write')) {
    return new Response(JSON.stringify({ success: false, error: 'ليس لديك صلاحية إضافة خدمات جديدة' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = serviceInputSchema.parse(rawBody);
    const { client } = getDb();

    // Verify category exists
    const catCheck = await client.execute({
      sql: 'SELECT id FROM service_categories WHERE id = ?;',
      args: [parsed.category_id],
    });
    if (catCheck.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'التصنيف المختار غير موجود' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify unique slug
    const slugCheck = await client.execute({
      sql: 'SELECT id FROM services WHERE slug = ?;',
      args: [parsed.slug],
    });
    if (slugCheck.rows.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'الرابط الفريد (Slug) مستخدم بالفعل' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parsed.id || parsed.slug;
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO services (
        id, category_id, featured_image_id, slug,
        title_ar, title_en, subtitle_ar, subtitle_en,
        description_ar, description_en, detailed_description_ar, detailed_description_en,
        is_signature, is_published, display_order,
        price_amount_halalas, price_currency, price_is_confirmed, price_display_ar, price_display_en,
        duration_minutes, duration_is_confirmed, duration_display_ar, duration_display_en,
        features_ar, features_en, benefits_ar, benefits_en, steps_ar, steps_en, includes_ar, includes_en,
        suitability_ar, suitability_en, advisory_ar, advisory_en,
        seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      );`,
      args: [
        id, parsed.category_id, parsed.featured_image_id ?? null, parsed.slug,
        parsed.title_ar, parsed.title_en, parsed.subtitle_ar, parsed.subtitle_en,
        parsed.description_ar, parsed.description_en, JSON.stringify(parsed.detailed_description_ar), JSON.stringify(parsed.detailed_description_en),
        parsed.is_signature, parsed.is_published, parsed.display_order,
        parsed.price_amount_halalas ?? null, parsed.price_currency, parsed.price_is_confirmed, parsed.price_display_ar, parsed.price_display_en,
        parsed.duration_minutes ?? null, parsed.duration_is_confirmed, parsed.duration_display_ar, parsed.duration_display_en,
        JSON.stringify(parsed.features_ar), JSON.stringify(parsed.features_en),
        JSON.stringify(parsed.benefits_ar), JSON.stringify(parsed.benefits_en),
        JSON.stringify(parsed.steps_ar), JSON.stringify(parsed.steps_en),
        JSON.stringify(parsed.includes_ar), JSON.stringify(parsed.includes_en),
        parsed.suitability_ar, parsed.suitability_en, parsed.advisory_ar, parsed.advisory_en,
        parsed.seo_title_ar, parsed.seo_title_en, parsed.seo_description_ar, parsed.seo_description_en,
        now, now
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'SERVICE',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم إضافة الخدمة بنجاح' }), {
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
