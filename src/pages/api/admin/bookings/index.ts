import type { APIRoute } from 'astro';
import { hasPermission } from '../../../../server/auth/rbac';

export const prerender = false;

// GET /api/admin/bookings — List booking requests
export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (!hasPermission(user, 'services:read') && !hasPermission(user, 'reviews:read'))) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.trim();

    const client = locals.dbClient!;

    let query = `
      SELECT b.*, s.title_ar as service_db_title_ar, s.title_en as service_db_title_en
      FROM booking_requests b
      LEFT JOIN services s ON b.service_id = s.id
    `;
    const conditions: string[] = [];
    const args: any[] = [];

    if (status && status !== 'all') {
      conditions.push('b.status = ?');
      args.push(status);
    }

    if (search) {
      conditions.push('(b.request_number LIKE ? OR b.client_name LIKE ? OR b.client_phone LIKE ?)');
      const term = `%${search}%`;
      args.push(term, term, term);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY b.created_at DESC;';

    const res = await client.execute({ sql: query, args });

    return new Response(JSON.stringify({ success: true, data: res.rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'فشل جلب الحجوزات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
