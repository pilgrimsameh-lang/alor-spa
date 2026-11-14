import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { hasPermission } from '../../../../server/auth/rbac';
import { recordActivityLog } from '../../../../server/audit/log-activity';
import { reviewInputSchema } from '../../../../server/validation/crud-schemas';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !hasPermission(user, 'reviews:approve')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك باعتماد أو استبدال المراجعات' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await request.json();
    const parsed = reviewInputSchema.parse(rawBody);
    const demoId = rawBody.demo_id ? String(rawBody.demo_id) : null;

    const client = locals.dbClient!;
    const now = Date.now();
    const id = parsed.id || crypto.randomUUID();

    // Insert the real verified review into SQLite
    await client.execute({
      sql: `INSERT INTO reviews (
        id, service_id, author_name, author_title_ar, author_title_en,
        quote_ar, quote_en, rating, is_verified, is_approved, display_order, review_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?);`,
      args: [
        id,
        parsed.service_id ?? null,
        parsed.author_name,
        parsed.author_title_ar ?? 'ضيفة موثقة',
        parsed.author_title_en ?? 'Verified Guest',
        parsed.quote_ar,
        parsed.quote_en,
        parsed.rating,
        parsed.is_approved, // 1 if published, 0 if pending
        parsed.display_order ?? 0,
        now,
        now,
        now,
      ],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'REVIEW',
      entityId: id,
      newValues: {
        action: 'REPLACE_DEMO',
        replacedDemoId: demoId,
        authorName: parsed.author_name,
        isApproved: parsed.is_approved,
      },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        id,
        message: 'تم استبدال النموذج وحفظ التقييم الحقيقي بنجاح!',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'فشل استبدال النموذج بالتقييم الحقيقي' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
