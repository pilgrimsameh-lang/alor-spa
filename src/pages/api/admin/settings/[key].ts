import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hasPermission } from '../../../../server/auth/rbac';
import { siteSettingInputSchema } from '../../../../server/validation/crud-schemas';
import { recordActivityLog } from '../../../../server/audit/log-activity';

export const prerender = false;

// PUT update site setting
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  // Settings modification is restricted to Super Admin or settings:write authority
  if (!user || (!hasPermission(user, 'settings:write') && user.roleSlug !== 'super_admin')) {
    return new Response(JSON.stringify({ success: false, error: 'غير مصرح لك بتعديل إعدادات النظام الحساسة' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = params.key;
  if (!key) {
    return new Response(JSON.stringify({ success: false, error: 'مفتاح الإعداد مطلوب' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { client } = getDb();
  const existingRes = await client.execute({
    sql: 'SELECT * FROM site_settings WHERE key = ?;',
    args: [key],
  });

  if (existingRes.rows.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'الإعداد غير موجود' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const currentSetting = existingRes.rows[0];

  // 1. STRICT IMMUTABILITY CHECK
  // Official WhatsApp number 966553543192 and immutable system records cannot be altered or deleted
  if (Number(currentSetting.is_immutable) === 1 || key === 'contact.whatsapp') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'هذا الإعداد محمي بصفة الأمان غير القابلة للتغيير (Immutable Setting). يمنع تعديل أو استبدال رقم الواتساب الرسمي (966553543192).',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = siteSettingInputSchema.parse(rawBody);
    const now = Date.now();

    await client.execute({
      sql: `UPDATE site_settings SET
        value_ar = ?, value_en = ?, value_raw = ?, updated_at = ?
      WHERE key = ?;`,
      args: [parsed.value_ar, parsed.value_en, parsed.value_raw ?? currentSetting.value_raw, now, key],
    });

    await recordActivityLog(client, {
      userId: user.id,
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: key,
      oldValues: currentSetting as any,
      newValues: parsed,
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return new Response(JSON.stringify({ success: true, message: 'تم تحديث الإعداد بنجاح' }), {
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
