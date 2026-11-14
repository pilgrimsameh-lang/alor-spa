import type { APIRoute } from 'astro';
import { hasPermission } from '../../../../server/auth/rbac';
import { blogPostInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET single blog post
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'blog:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const client = locals.dbClient!;
  const res = await client.execute({
    sql: 'SELECT * FROM blog_posts WHERE id = ?;',
    args: [params.id],
  });

  if (res.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المقال غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, data: res.rows[0] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT update blog post
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'blog:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل المقالات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM blog_posts WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المقال غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  try {
    const rawBody = await request.json();
    const parsed = blogPostInputSchema.parse(rawBody);
    const now = Date.now();
    const publishedAt = parsed.is_published === 1 ? (oldValues.published_at || parsed.published_at || now) : null;

    await client.execute({
      sql: `UPDATE blog_posts SET
        slug = ?, featured_image_id = ?, title_ar = ?, title_en = ?,
        excerpt_ar = ?, excerpt_en = ?, content_ar = ?, content_en = ?,
        author_name = ?, is_published = ?, published_at = ?,
        seo_title_ar = ?, seo_title_en = ?, seo_desc_ar = ?, seo_desc_en = ?,
        updated_at = ?
      WHERE id = ?;`,
      args: [
        parsed.slug, parsed.featured_image_id ?? null, parsed.title_ar, parsed.title_en,
        parsed.excerpt_ar, parsed.excerpt_en, parsed.content_ar, parsed.content_en,
        parsed.author_name, parsed.is_published, publishedAt,
        parsed.seo_title_ar ?? null, parsed.seo_title_en ?? null, parsed.seo_desc_ar ?? null, parsed.seo_desc_en ?? null,
        now, id
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'BLOG',
      entityId: id,
      oldValues: oldValues as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث المقال بنجاح' }), {
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

// DELETE blog post
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'blog:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بحذف المقالات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  const client = locals.dbClient!;

  const existingRes = await client.execute({
    sql: 'SELECT * FROM blog_posts WHERE id = ?;',
    args: [id],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'المقال غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const oldValues = existingRes.rows[0];

  await client.execute({
    sql: 'DELETE FROM blog_posts WHERE id = ?;',
    args: [id],
  });

  await recordActivityLog(client, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'BLOG',
    entityId: id,
    oldValues: oldValues as any,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  });

  return new Response(JSON.stringify({ success: true, message: 'تم حذف المقال بنجاح' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
