import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';

export const prerender = false;

// GET: List all media files with search and filter capabilities
export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'media:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك باستعراض مكتبة الوسائط' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const type = url.searchParams.get('type')?.trim().toLowerCase() || '';
  const sort = url.searchParams.get('sort')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const { client } = getDb();

  let sqlQuery = `
    SELECT 
      m.*,
      u.full_name as uploader_name,
      (
        (SELECT COUNT(*) FROM services WHERE featured_image_id = m.id) +
        (SELECT COUNT(*) FROM offers WHERE image_id = m.id) +
        (SELECT COUNT(*) FROM gallery_items WHERE media_id = m.id) +
        (SELECT COUNT(*) FROM blog_posts WHERE featured_image_id = m.id)
      ) as usage_count
    FROM media_files m
    LEFT JOIN admin_users u ON m.uploaded_by = u.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (q) {
    sqlQuery += ` AND (
      m.original_name LIKE ? OR 
      m.filename LIKE ? OR 
      m.title_ar LIKE ? OR 
      m.title_en LIKE ? OR 
      m.alt_ar LIKE ? OR 
      m.alt_en LIKE ?
    )`;
    const wildcard = `%${q}%`;
    args.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  if (type) {
    if (type === 'webp') {
      sqlQuery += ` AND m.mime_type = 'image/webp'`;
    } else if (type === 'jpeg' || type === 'jpg') {
      sqlQuery += ` AND m.mime_type = 'image/jpeg'`;
    } else if (type === 'png') {
      sqlQuery += ` AND m.mime_type = 'image/png'`;
    }
  }

  sqlQuery += ` ORDER BY m.created_at ${sort};`;

  const res = await client.execute({
    sql: sqlQuery,
    args,
  });

  return new Response(
    JSON.stringify({
      success: true,
      total: res.rows.length,
      data: res.rows,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
