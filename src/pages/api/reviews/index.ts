import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../server/db/index';

export const prerender = false;

// Simple in-memory rate-limiter for public review submissions (max 5 per IP per 10 mins)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 5) {
    return true;
  }
  entry.count++;
  return false;
}

function sanitizeText(str: string): string {
  return str
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"'&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim();
}

// GET /api/reviews — Returns only approved reviews
export const GET: APIRoute = async () => {
  try {
    const { client } = getDb();
    const res = await client.execute(`
      SELECT 
        id, author_name, author_title_ar, author_title_en,
        quote_ar, quote_en, rating, is_verified, review_date
      FROM reviews
      WHERE is_approved = 1
      ORDER BY display_order ASC, created_at DESC;
    `);

    return new Response(JSON.stringify({ success: true, data: res.rows }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: 'تعذر جلب التقييمات' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/reviews — Submit guest review (Pending moderation)
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'لقد أرسلتِ عدة طلبات مؤخراً. يرجى الانتظار قليلاً قبل المحاولة مجدداً.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawBody = await request.json();
    const name = sanitizeText(String(rawBody.name || ''));
    const quote = sanitizeText(String(rawBody.quote || ''));
    const rating = Math.min(5, Math.max(1, parseInt(String(rawBody.rating || '5'), 10)));
    const serviceId = rawBody.service_id ? sanitizeText(String(rawBody.service_id)) : null;

    if (!name || name.length < 2 || name.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'يرجى كتابة الاسم بشكل صحيح (حرفين إلى 100 حرف).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!quote || quote.length < 5 || quote.length > 1000) {
      return new Response(
        JSON.stringify({ success: false, error: 'يرجى كتابة رأيك بوضوح (5 أحرف على الأقل).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { client } = getDb();
    const id = crypto.randomUUID();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO reviews (
        id, service_id, author_name, author_title_ar, author_title_en,
        quote_ar, quote_en, rating, is_verified, is_approved, display_order, review_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?);`,
      args: [
        id,
        serviceId,
        name,
        'ضيفة ألور سبا',
        'ALOR SPA Guest',
        quote,
        quote,
        rating,
        now,
        now,
        now,
      ],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'شكراً لمشاركتكِ رأيكِ الكريم! تم استلام تقييمكِ وبانتظار اعتماده من إدارة السبا.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'حدث خطأ أثناء معالجة التقييم، يرجى المحاولة لاحقاً.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
