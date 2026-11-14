import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { recordActivityLog } from '../../../../server/audit/log-activity';
import { DEMO_GUESTBOOK_REVIEWS } from '../../../../data/demo-reviews';

export const prerender = false;

export const TEST_REVIEW_MODELS = DEMO_GUESTBOOK_REVIEWS;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || (!hasPermission(user, 'reviews:approve') && !hasPermission(user, 'reviews:read'))) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { client } = getDb();
    const now = Date.now();
    let insertedCount = 0;

    for (let i = 0; i < DEMO_GUESTBOOK_REVIEWS.length; i++) {
      const model = DEMO_GUESTBOOK_REVIEWS[i];
      const id = `demo_${model.id}_${now}`;

      // Test reviews are saved strictly as PENDING / DRAFT (is_approved = 0)
      // They are NEVER published to website visitors without explicit admin approval
      await client.execute({
        sql: `INSERT INTO reviews (
          id, service_id, author_name, author_title_ar, author_title_en,
          quote_ar, quote_en, rating, is_verified, is_approved, display_order, review_date,
          created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?);`,
        args: [
          id,
          model.name,
          `نموذج تجريبي — ${model.topicAr}`,
          `Demo Model — ${model.topicEn}`,
          model.quoteAr,
          model.quoteEn,
          model.rating,
          i + 1,
          now - i * 3600000,
          now - i * 3600000,
          now,
        ],
      });
      insertedCount++;
    }

    await recordActivityLog(client, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'REVIEW',
      entityId: 'seed_20_demo_guestbook_models',
      newValues: { count: insertedCount, status: 'Draft / Demo' },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedCount,
        message: `تم تحميل ${insertedCount} نموذج تجريبي بنجاح في حالة «مسودة / بانتظار المراجعة».`,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'فشل تحميل النماذج التجريبية' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
