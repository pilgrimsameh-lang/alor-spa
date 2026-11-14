import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { bookingRequestInputSchema } from '../../../server/validation/crud-schemas';

export const prerender = false;

// Simple in-memory rate-limiter for public booking requests (max 5 per IP per 10 mins)
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

function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `ALOR-BK-${year}-${randomSuffix}`;
}

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'لقد أرسلتِ عدة طلبات مؤخراً. يرجى الانتظار بضع دقائق قبل المحاولة مجدداً.',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = bookingRequestInputSchema.parse({
      client_name: sanitizeText(String(rawBody.client_name || '')),
      client_phone: sanitizeText(String(rawBody.client_phone || '')),
      service_id: rawBody.service_id ? sanitizeText(String(rawBody.service_id)) : null,
      service_name: sanitizeText(String(rawBody.service_name || '')),
      preferred_date: sanitizeText(String(rawBody.preferred_date || '')),
      preferred_time: sanitizeText(String(rawBody.preferred_time || '')),
      notes: rawBody.notes ? sanitizeText(String(rawBody.notes)) : null,
    });

    const client = locals.dbClient;
    if (!client) {
      return new Response(JSON.stringify({ success: false, error: 'Database unavailable' }), { status: 500 });
    }
    const id = crypto.randomUUID();
    const requestNumber = generateBookingReference();
    const now = Date.now();

    await client.execute({
      sql: `INSERT INTO booking_requests (
        id, request_number, client_name, client_phone, service_id, service_name,
        preferred_date, preferred_time, notes, status, admin_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?);`,
      args: [
        id,
        requestNumber,
        parsed.client_name,
        parsed.client_phone,
        parsed.service_id || null,
        parsed.service_name,
        parsed.preferred_date,
        parsed.preferred_time,
        parsed.notes || null,
        now,
        now,
      ],
    });

    return new Response(
      JSON.stringify({
        success: true,
        requestNumber,
        clientName: parsed.client_name,
        message: `شكرًا لكِ أختنا ${parsed.client_name} 🌸 تم استلام طلب حجزكِ بنجاح!`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const errorMessage = err?.errors?.[0]?.message || err?.message || 'حدث خطأ أثناء معالجة طلب الحجز';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
