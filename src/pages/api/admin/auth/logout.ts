import type { APIRoute } from 'astro';
import { getDb } from '../../../../server/db/index';
import { hashSessionToken, SESSION_CONFIG } from '../../../../server/auth/session';
import { getServerConfig } from '../../../../server/config';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const config = getServerConfig();
  const { client } = getDb();

  // 1. Anti-CSRF Origin check
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new Response(
          JSON.stringify({ success: false, error: 'فشل التحقق من أمان الطلب (CSRF Origin Mismatch)' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'مصدر الطلب غير صالح (Invalid Origin Header)' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. Extract session token
  const token = cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    const now = Date.now();

    // Revoke session in SQLite immediately
    try {
      await client.execute({
        sql: `UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL;`,
        args: [now, tokenHash],
      });
    } catch {
      // Continue even if database update fails to ensure cookie is cleared on client
    }
  }

  // 3. Clear cookie on client
  cookies.delete(SESSION_CONFIG.COOKIE_NAME, { path: '/' });

  const isProd = config.NODE_ENV === 'production';
  const clearCookieHeader = `${SESSION_CONFIG.COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${isProd ? 'Secure;' : ''}`;

  return new Response(
    JSON.stringify({ success: true, message: 'تم تسجيل الخروج بنجاح' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookieHeader,
      },
    }
  );
};
