import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../../server/db/index';
import { adminUsers, adminSessions } from '../../../../server/db/schema';
import { eq, or } from 'drizzle-orm';
import { getServerConfig } from '../../../../server/config';
import { verifyPassword, DUMMY_HASH } from '../../../../server/auth/password';
import {
  computeHmacKey,
  acquireReservation,
  cancelReservation,
  finalizeAuthentication,
} from '../../../../server/auth/rate-limit';
import { argon2Limiter } from '../../../../server/auth/resource-limiter';
import { extractClientIp, InvalidIpHeaderError } from '../../../../server/auth/ip';
import { hashSessionToken, SESSION_CONFIG } from '../../../../server/auth/session';

export const prerender = false;

const GENERIC_ERROR_AR = 'البريد الإلكتروني/اسم المستخدم أو كلمة المرور غير صحيحة';
const LOCKOUT_ERROR_AR = 'تم تعليق المحاولات مؤقتاً لسلامة النظام. يرجى الانتظار 15 دقيقة قبل المحاولة من جديد.';
const BUSY_ERROR_AR = 'خوادم المصادقة تحت ضغط مؤقت، يرجى المحاولة بعد لحظات.';

export const POST: APIRoute = async ({ request }) => {
  const config = getServerConfig();
  const { client, db } = getDb();
  const now = Date.now();

  // 1. Origin & Anti-CSRF Check
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const isLocalLoopback =
        (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1')) &&
        host &&
        (host.startsWith('localhost') || host.startsWith('127.0.0.1'));

      if (host && originHost !== host && !isLocalLoopback) {
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

  // 2. Extract and sanitize client IP
  let clientIp = '127.0.0.1';
  try {
    const rawPeer = request.headers.get('x-real-ip') || '127.0.0.1';
    const forwardedHeader = request.headers.get('x-forwarded-for');
    const trustedList = config.TRUSTED_PROXIES.split(',').map((s) => s.trim()).filter(Boolean);
    clientIp = extractClientIp({
      peerIp: rawPeer,
      forwardedForHeader: forwardedHeader,
      trustedProxies: trustedList,
    });
  } catch (ipErr) {
    if (ipErr instanceof InvalidIpHeaderError) {
      return new Response(
        JSON.stringify({ success: false, error: 'بيانات شبكة غير صالحة (Invalid Network Headers)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 3. Parse JSON or Form Body
  const contentType = request.headers.get('content-type') || '';
  const isFormUrlEncoded = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  let body: any = {};

  if (isFormUrlEncoded) {
    try {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } catch {
      body = {};
    }
  } else {
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'صيغة البيانات المرسلة غير صالحة' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const urlObj = new URL(request.url);
  const targetRedirect =
    (typeof body?.redirect === 'string' && body.redirect.startsWith('/admin'))
      ? body.redirect
      : (urlObj.searchParams.get('redirect')?.startsWith('/admin') ? urlObj.searchParams.get('redirect')! : '/admin');

  const rawIdentifier = body?.identifier || body?.email || body?.username;
  const rawPassword = body?.password;

  if (!rawIdentifier || !rawPassword || typeof rawIdentifier !== 'string' || typeof rawPassword !== 'string') {
    if (isFormUrlEncoded) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/admin/login?error=${encodeURIComponent('اسم المستخدم وكلمة المرور مطلوبة')}&redirect=${encodeURIComponent(targetRedirect)}`,
        },
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: 'اسم المستخدم/البريد الإلكتروني وكلمة المرور مطلوبة' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const identifier = rawIdentifier.trim().toLowerCase();
  const password = rawPassword;

  // 4. Compute HMAC Key for IP
  const secret = config.RATE_LIMIT_SECRET || config.SESSION_SECRET;
  const version = config.RATE_LIMIT_KEY_VERSION || 1;
  const ipKey = computeHmacKey(clientIp, secret, version);

  // 5. Query user account (constant-time lookup)
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(or(eq(adminUsers.email, identifier), eq(adminUsers.username, identifier)))
    .limit(1);

  const isKnownUser = !!user && user.is_active === 1;
  const accountId = isKnownUser ? user.id : null;
  const targetHash = isKnownUser ? user.password_hash : DUMMY_HASH;
  const accountGen = isKnownUser ? user.login_generation : null;

  // 6. Acquire Rate Limit Reservation
  const reservation = await acquireReservation(client, {
    ipKey,
    accountId,
    accountGen,
    now,
  });

  if (!reservation.admitted) {
    if (reservation.reason === 'IP_BLOCKED' || reservation.reason === 'ACCOUNT_LOCKED') {
      return new Response(
        JSON.stringify({ success: false, error: LOCKOUT_ERROR_AR }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '900',
          },
        }
      );
    }
    // Concurrency / Global cap limit
    return new Response(
      JSON.stringify({ success: false, error: BUSY_ERROR_AR }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '2',
        },
      }
    );
  }

  const reservationId = reservation.reservationId!;

  // 7. Acquire Argon2 Limiter Semaphore
  let releaseSemaphore: (() => void) | null = null;
  try {
    releaseSemaphore = await argon2Limiter.acquire(2500);
  } catch {
    await cancelReservation(client, reservationId);
    return new Response(
      JSON.stringify({ success: false, error: BUSY_ERROR_AR }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '2',
        },
      }
    );
  }

  // 8. Pre-crypto Lease Check (ensure at least 2000ms remain on lease)
  if (Date.now() + 2000 > reservation.leaseExpiresAt!) {
    releaseSemaphore();
    await cancelReservation(client, reservationId);
    return new Response(
      JSON.stringify({ success: false, error: BUSY_ERROR_AR }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '2',
        },
      }
    );
  }

  // 9. Execute native Argon2id verification
  let passwordMatches = false;
  try {
    passwordMatches = await verifyPassword(targetHash, password);
  } catch {
    passwordMatches = false;
  } finally {
    // CRITICAL: Semaphore is strictly released here AFTER native thread completes
    releaseSemaphore();
  }

  const isAuthentic = isKnownUser && passwordMatches;

  // 10. Check Idempotency for concurrent identical logins from the same client
  let rawToken: string | null = null;
  let tokenHash: string | null = null;

  if (isAuthentic && accountId) {
    // Check if an active session was already issued for this user from this IP in the last 2 seconds
    const recentSessionRes = await client.execute({
      sql: `SELECT id FROM admin_sessions 
            WHERE user_id = ? AND ip_address = ? AND created_at >= ? AND revoked_at IS NULL
            LIMIT 1;`,
      args: [accountId, clientIp, now - 2000],
    });

    if (recentSessionRes.rows.length === 0) {
      rawToken = crypto.randomBytes(32).toString('hex');
      tokenHash = hashSessionToken(rawToken);
    }
  }

  // 11. Finalize Authentication in SQLite atomically
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const finalResult = await finalizeAuthentication(client, {
    reservationId,
    ipKey,
    accountId,
    accountGen,
    isAuthentic,
    canIssueSession: !!tokenHash,
    tokenHash,
    clientIp,
    userAgent,
    now: Date.now(),
  });

  // 12. Return Response
  if (finalResult.success && finalResult.sessionCreated && rawToken) {
    const isProd = config.NODE_ENV === 'production';
    const cookieHeader = `${SESSION_CONFIG.COOKIE_NAME}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; ${isProd ? 'Secure;' : ''}`;

    if (isFormUrlEncoded) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: targetRedirect,
          'Set-Cookie': cookieHeader,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, redirect: targetRedirect }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  }

  if (finalResult.errorCode === 'RATE_LIMITED' || finalResult.errorCode === 'ACCOUNT_LOCKED') {
    if (isFormUrlEncoded) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/admin/login?error=${encodeURIComponent(LOCKOUT_ERROR_AR)}&redirect=${encodeURIComponent(targetRedirect)}`,
        },
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: LOCKOUT_ERROR_AR }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      }
    );
  }

  if (isFormUrlEncoded) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/login?error=${encodeURIComponent(GENERIC_ERROR_AR)}&redirect=${encodeURIComponent(targetRedirect)}`,
      },
    });
  }

  return new Response(
    JSON.stringify({ success: false, error: GENERIC_ERROR_AR }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
};
