/**
 * ============================================================================
 * ALOR SPA — Role-Based Access Control (RBAC) & Authority Enforcement
 * Strictly verifies permissions against server database session, never from client
 * ============================================================================
 */

export class ForbiddenError extends Error {
  constructor(message = 'ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export type AdminUserLocal = NonNullable<App.Locals['user']>;

/**
 * Checks whether an authenticated user has a specific permission.
 * Super Administrators (`role_super_admin` / `super_admin`) bypass all permission checks.
 */
export function hasPermission(
  user: App.Locals['user'] | undefined | null,
  requiredPermission: string
): boolean {
  if (!user) return false;

  // Super administrator has universal authority
  if (user.roleSlug === 'super_admin' || user.roleId === 'role_super_admin') {
    return true;
  }

  if (user.permissions.includes('*')) {
    return true;
  }

  return user.permissions.includes(requiredPermission);
}

/**
 * Asserts that the authenticated user possesses the required permission,
 * throwing a ForbiddenError if authorization fails.
 */
export function requirePermission(
  user: App.Locals['user'] | undefined | null,
  requiredPermission: string
): asserts user is AdminUserLocal {
  if (!user) {
    throw new ForbiddenError('المصادقة مطلوبة لإتمام هذه العملية.');
  }

  if (!hasPermission(user, requiredPermission)) {
    throw new ForbiddenError(`صلاحية غير كافية: العملية تتطلب (${requiredPermission}).`);
  }
}
