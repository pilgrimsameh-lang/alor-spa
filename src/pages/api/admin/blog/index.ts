import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { blogPostInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// GET list blog posts
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'blog:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute('SELECT * FROM blog_posts ORDER BY created_at DESC;');

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST create blog post
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'blog:write')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بنشر مقالات بالمدونة' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = blogPostInputSchema.parse(rawBody);
    const { client } = getDb();

    // Check slug uniqueness
    const slugCheck = await client.execute({
      sql: 'SELECT id FROM blog_posts WHERE slug = ?;',
      args: [parsed.slug],
    });
    if (slugCheck.rows.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'الرابط الفريد (Slug) مستخدم بالفعل' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = parsed.id || crypto.randomUUID();
    const now = Date.now();
    const publishedAt = parsed.is_published === 1 ? (parsed.published_at || now) : null;

    await client.execute({
      sql: `INSERT INTO blog_posts (
        id, slug, featured_image_id, title_ar, title_en,
        excerpt_ar, excerpt_en, content_ar, content_en, author_name,
        is_published, published_at, seo_title_ar, seo_title_en, seo_desc_ar, seo_desc_en,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id, parsed.slug, parsed.featured_image_id ?? null, parsed.title_ar, parsed.title_en,
        parsed.excerpt_ar, parsed.excerpt_en, parsed.content_ar, parsed.content_en, parsed.author_name,
        parsed.is_published, publishedAt, parsed.seo_title_ar ?? null, parsed.seo_title_en ?? null,
        parsed.seo_desc_ar ?? null, parsed.seo_desc_en ?? null,
        now, now
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'BLOG',
      entityId: id,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, id, message: 'تم حفظ المقال بنجاح' }), {
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
