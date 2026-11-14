import type { AdminUserLocal } from './rbac';
import { hasPermission } from './rbac';

export interface AdminNavItem {
  id: string;
  href: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  requiredPermission?: string;
  badge?: {
    textAr: string;
    textEn: string;
    color?: string;
  };
  group: 'overview' | 'content' | 'media' | 'system' | 'security';
}

export const ADMIN_GROUPS = [
  { id: 'overview', titleAr: 'نظرة عامة', titleEn: 'Overview' },
  { id: 'content', titleAr: 'إدارة المحتوى', titleEn: 'Content Management' },
  { id: 'media', titleAr: 'مكتبة الوسائط', titleEn: 'Media & Assets' },
  { id: 'system', titleAr: 'إعدادات النظام', titleEn: 'System Configuration' },
  { id: 'security', titleAr: 'الأمان والوصول', titleEn: 'Security & Access' },
] as const;

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'dashboard',
    href: '/admin',
    titleAr: 'لوحة التحكم',
    titleEn: 'Dashboard',
    descriptionAr: 'نظرة عامة وإحصائيات النظام الفورية',
    descriptionEn: 'System overview & live analytics',
    icon: 'dashboard',
    requiredPermission: undefined,
    group: 'overview',
  },
  {
    id: 'services',
    href: '/admin/services',
    titleAr: 'إدارة الخدمات',
    titleEn: 'Services',
    descriptionAr: 'قائمة خدمات السبا والأسعار والمواصفات',
    descriptionEn: 'Spa services catalog and pricing',
    icon: 'services',
    requiredPermission: 'services:read',
    group: 'content',
  },
  {
    id: 'categories',
    href: '/admin/categories',
    titleAr: 'إدارة التصنيفات',
    titleEn: 'Categories',
    descriptionAr: 'تصنيفات الخدمات وتنظيم القوائم',
    descriptionEn: 'Service categories and taxonomy',
    icon: 'categories',
    requiredPermission: 'services:read',
    group: 'content',
  },
  {
    id: 'offers',
    href: '/admin/offers',
    titleAr: 'العروض والباقات',
    titleEn: 'Offers & Packages',
    descriptionAr: 'الباقات الترويجية والخصومات الموسمية',
    descriptionEn: 'Promotional packages and seasonal discounts',
    icon: 'offers',
    requiredPermission: 'offers:read',
    group: 'content',
  },
  {
    id: 'gallery',
    href: '/admin/gallery',
    titleAr: 'معرض الصور',
    titleEn: 'Gallery',
    descriptionAr: 'صور السبا ومرافق الاسترخاء الفاخرة',
    descriptionEn: 'Spa facilities and relaxation gallery',
    icon: 'gallery',
    requiredPermission: 'gallery:read',
    group: 'content',
  },
  {
    id: 'reviews',
    href: '/admin/reviews',
    titleAr: 'آراء العملاء',
    titleEn: 'Reviews',
    descriptionAr: 'إدارة واعتماد تجارب ضيفات السبا',
    descriptionEn: 'Customer testimonials & moderation queue',
    icon: 'reviews',
    requiredPermission: 'reviews:read',
    group: 'content',
  },
  {
    id: 'blog',
    href: '/admin/blog',
    titleAr: 'المدونة والمقالات',
    titleEn: 'Blog & Articles',
    descriptionAr: 'مقالات الاسترخاء والعناية بالجمال',
    descriptionEn: 'Wellness tips and beauty articles',
    icon: 'blog',
    requiredPermission: 'blog:read',
    group: 'content',
  },
  {
    id: 'media',
    href: '/admin/media',
    titleAr: 'مكتبة الوسائط',
    titleEn: 'Media Library',
    descriptionAr: 'الملفات المرفوعة والصور المحسنة WebP',
    descriptionEn: 'Optimized media assets & WebP uploads',
    icon: 'media',
    requiredPermission: 'media:read',
    group: 'media',
  },
  {
    id: 'settings',
    href: '/admin/settings',
    titleAr: 'إعدادات الموقع',
    titleEn: 'Site Settings',
    descriptionAr: 'بيانات التواصل، الواتساب وساعات العمل',
    descriptionEn: 'Contact info, WhatsApp & operating hours',
    icon: 'settings',
    requiredPermission: 'settings:read',
    group: 'system',
  },
  {
    id: 'users',
    href: '/admin/users',
    titleAr: 'إدارة المستخدمين',
    titleEn: 'Admin Users',
    descriptionAr: 'حسابات مدراء النظام والوصول المعتمد',
    descriptionEn: 'System administrators and accounts',
    icon: 'users',
    requiredPermission: 'users:read',
    group: 'security',
  },
  {
    id: 'roles',
    href: '/admin/roles',
    titleAr: 'الأدوار والصلاحيات',
    titleEn: 'Roles & Permissions',
    descriptionAr: 'مصفوفة صلاحيات RBAC للأدوار الإدارية',
    descriptionEn: 'RBAC permissions matrix and privileges',
    icon: 'roles',
    requiredPermission: 'roles:read',
    group: 'security',
  },
  {
    id: 'activity-logs',
    href: '/admin/activity-logs',
    titleAr: 'سجل النشاطات',
    titleEn: 'Activity Logs',
    descriptionAr: 'سجل المراقبة والتدقيق الأمني للإجراءات',
    descriptionEn: 'Audit trail and security activity logs',
    icon: 'logs',
    requiredPermission: 'logs:read',
    group: 'security',
  },
];

/**
 * Filter navigation items strictly against the user's verified server permissions.
 * Never displays unauthorized links to the client.
 */
export function getAccessibleNavItems(user: AdminUserLocal | null | undefined): AdminNavItem[] {
  if (!user) return [];
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(user, item.requiredPermission);
  });
}

/**
 * Finds metadata for the current pathname.
 */
export function getSectionMetadata(pathname: string): AdminNavItem | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/admin';
  return (
    ADMIN_NAV_ITEMS.find((item) => item.href === normalized) ||
    ADMIN_NAV_ITEMS.find((item) => item.href !== '/admin' && normalized.startsWith(item.href))
  );
}

/**
 * Validates whether the user possesses authorization for the current route.
 */
export function canAccessSection(
  user: AdminUserLocal | null | undefined,
  requiredPermission?: string
): boolean {
  if (!user) return false;
  if (!requiredPermission) return true;
  return hasPermission(user, requiredPermission);
}
