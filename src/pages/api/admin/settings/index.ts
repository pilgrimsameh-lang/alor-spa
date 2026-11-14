import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';

export const prerender = false;

// GET all site settings
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'settings:read')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const res = await client.execute('SELECT * FROM site_settings ORDER BY group_name ASC, key ASC;');

  return new Response(JSON.stringify({ success: true, data: res.rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
