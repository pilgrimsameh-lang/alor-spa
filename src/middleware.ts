import { defineMiddleware } from 'astro:middleware';
import { getServerConfig } from './server/config';
import { getDb, getDbFromD1 } from './server/db/index';
import { validateSession, SESSION_CONFIG } from './server/auth/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const runtimeEnv = context.locals.runtime?.env;

  // Validate server environment configuration using Cloudflare runtime env or process.env
  context.locals.config = getServerConfig(runtimeEnv);
  context.locals.user = null;
  context.locals.session = null;

  const pathname = context.url.pathname;
  const isApiAdmin = pathname.startsWith('/api/admin');
  const isAdminPage = pathname.startsWith('/admin');
  const isBookingApi = pathname.startsWith('/api/bookings');
  const isReviewApi = pathname.startsWith('/api/reviews');

  // Initialize DB instance for routes needing database operations
  const needsDb = isApiAdmin || isAdminPage || isBookingApi || isReviewApi;
  if (needsDb) {
    if (runtimeEnv?.DB) {
      const { client, db } = getDbFromD1(runtimeEnv.DB);
      context.locals.db = db;
      context.locals.dbClient = client;
    } else {
      try {
        const { client, db } = getDb();
        context.locals.db = db as any;
        context.locals.dbClient = client;
      } catch (err) {
        console.warn('[Middleware] Local getDb fallback unavailable:', err);
      }
    }
  }

  // If request is not targeting admin dashboard or admin APIs, proceed directly
  if (!isApiAdmin && !isAdminPage) {
    return next();
  }

  // Public authentication routes (whitelist)
  const isLoginRoute =
    pathname === '/admin/login' ||
    pathname === '/admin/login/' ||
    pathname === '/admin/dev-login' ||
    pathname === '/admin/dev-login/' ||
    pathname === '/api/admin/auth/login' ||
    pathname === '/api/admin/auth/login/' ||
    pathname === '/api/admin/auth/dev-login' ||
    pathname === '/api/admin/auth/dev-login/';

  const sessionCookie = context.cookies.get(SESSION_CONFIG.COOKIE_NAME)?.value;

  // If accessing /admin/login while already holding a valid session, redirect to /admin dashboard
  if (isLoginRoute && !isApiAdmin && sessionCookie && context.locals.dbClient) {
    const check = await validateSession(context.locals.dbClient, sessionCookie);
    if (check.valid && check.user) {
      return context.redirect('/admin');
    }
  }

  // If accessing public login endpoints, allow through
  if (isLoginRoute) {
    return next();
  }

  // 1. Anti-CSRF on state-changing methods for all admin routes
  const method = context.request.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = context.request.headers.get('origin');
    const referer = context.request.headers.get('referer');
    const host = context.request.headers.get('host');

    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (host && originHost !== host) {
          if (isApiAdmin) {
            return new Response(
              JSON.stringify({ success: false, error: 'فشل التحقق من أمان الطلب (CSRF Origin Mismatch)' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response('Forbidden (CSRF Protection)', { status: 403 });
        }
      } catch {
        return new Response('Forbidden (Invalid Origin)', { status: 403 });
      }
    } else if (referer) {
      try {
        const refererHost = new URL(referer).host;
        if (host && refererHost !== host) {
          return new Response('Forbidden (CSRF Referer Mismatch)', { status: 403 });
        }
      } catch {
        return new Response('Forbidden (Invalid Referer)', { status: 403 });
      }
    }
  }

  // 2. Validate Session
  if (!sessionCookie) {
    if (isApiAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'المصادقة مطلوبة للوصول إلى هذه الواجهة (Authentication Required)' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const redirectUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
    return context.redirect(redirectUrl);
  }

  if (!context.locals.dbClient) {
    if (isApiAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'تعذر الاتصال بقاعدة البيانات (Database Connection Error)' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Database Connection Unavailable', { status: 500 });
  }

  const sessionResult = await validateSession(context.locals.dbClient, sessionCookie);

  if (!sessionResult.valid || !sessionResult.user || !sessionResult.session) {
    // Clear invalid / expired / revoked cookie
    context.cookies.delete(SESSION_CONFIG.COOKIE_NAME, { path: '/' });

    if (isApiAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'انتهت صلاحية الجلسة أو تم إبطالها (Session Expired or Revoked)',
          reason: sessionResult.reason,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return context.redirect('/admin/login');
  }

  // 3. Attach authenticated user and session to context locals
  context.locals.user = sessionResult.user;
  context.locals.session = sessionResult.session;

  return next();
});
