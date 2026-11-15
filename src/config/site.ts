/**
 * ALOR SPA — Centralized Site & Business Configuration
 *
 * All business details, contact information, social links, and booking numbers
 * are consolidated here. No fake phone numbers or addresses are invented.
 */

export interface BusinessConfig {
  name: {
    ar: string;
    en: string;
  };
  legalName: string;
  category: {
    ar: string;
    en: string;
  };
  city: {
    ar: string;
    en: string;
  };
  address: {
    ar: string;
    en: string;
    isExact: boolean;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  hours: {
    ar: string;
    en: string;
    isPlaceholder: boolean;
  };
  social: {
    instagram?: string;
    snapchat?: string;
    tiktok?: string;
    x?: string;
  };
}

export const siteConfig: BusinessConfig = {
  name: {
    ar: 'ألور سبا',
    en: 'ALOR SPA',
  },
  legalName: 'ALOR SPA Luxury Women Wellness Center',
  category: {
    ar: 'سبا ومساج نسائي فاخر',
    en: "Luxury Women's Spa & Massage Sanctuary",
  },
  city: {
    ar: 'الرياض، المملكة العربية السعودية',
    en: 'Riyadh, Kingdom of Saudi Arabia',
  },
  address: {
    ar: 'الرياض، المملكة العربية السعودية (الموقع الدقيق يعلن قريباً)',
    en: 'Riyadh, Saudi Arabia (Exact location to be announced)',
    isExact: false,
  },
  coordinates: {
    lat: 24.7136, // Central Riyadh landmark
    lng: 46.6753,
  },
  contact: {
    phone: (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_PHONE_NUMBER) || (typeof process !== 'undefined' && process.env?.PUBLIC_PHONE_NUMBER) || '',
    whatsapp: (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_WHATSAPP_NUMBER)?.trim() || (typeof process !== 'undefined' && process.env?.PUBLIC_WHATSAPP_NUMBER)?.trim() || '966553543192',
    email: (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_CONTACT_EMAIL) || (typeof process !== 'undefined' && process.env?.PUBLIC_CONTACT_EMAIL) || '',
  },
  hours: {
    ar: 'من الساعة 11:00 صباحًا حتى الساعة 11:00 مساءً.',
    en: '11:00 AM – 11:00 PM',
    isPlaceholder: false,
  },
  social: {
    instagram: 'https://www.instagram.com/alor_homspa/',
    tiktok: 'https://www.tiktok.com/@alor_homspa',
  },
};

/**
 * Resolves the official site base URL.
 * Priority:
 * 1. SITE_URL or PUBLIC_SITE_URL environment variable
 * 2. Canonical production fallback: https://alorspa.com
 */
export function getSiteUrl(): string {
  let envUrl = '';
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    envUrl = (import.meta.env.SITE_URL as string) || (import.meta.env.PUBLIC_SITE_URL as string) || '';
  }
  if (!envUrl && typeof process !== 'undefined' && process.env) {
    envUrl = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || '';
  }
  return envUrl ? envUrl.trim().replace(/\/+$/, '') : 'https://alor-spa.vercel.app';
}

/**
 * Checks whether an official WhatsApp number is actively configured.
 */
export function isWhatsAppConfigured(): boolean {
  const num = (siteConfig.contact.whatsapp || '').trim();
  // Valid if non-empty, contains digits, not a placeholder, and has at least 8 digits
  if (!num || num.includes('X')) return false;
  const clean = sanitizePhoneNumber(num);
  return clean.length >= 8;
}

/**
 * Clean phone number for tel: or wa.me/ links
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Normalizes phone number to official international Saudi format for WhatsApp (wa.me)
 * Never leaves a local leading '05' in wa.me URLs.
 * E.g., '0553543192' -> '966553543192'
 * E.g., '+966553543192' -> '966553543192'
 * E.g., '00966553543192' -> '966553543192'
 * E.g., '966553543192' -> '966553543192'
 */
export function normalizeWhatsAppNumber(phone: string): string {
  let clean = sanitizePhoneNumber(phone);
  if (clean.startsWith('00966')) {
    clean = clean.slice(2);
  } else if (clean.startsWith('05') && clean.length === 10) {
    clean = `966${clean.slice(1)}`;
  } else if (clean.startsWith('5') && clean.length === 9) {
    clean = `966${clean}`;
  }
  return clean;
}

/**
 * Formats WhatsApp number for UI display in local Saudi format (0553543192).
 */
export function getWhatsAppDisplayNumber(): string {
  const num = (siteConfig.contact.whatsapp || '').trim();
  if (!num) return '';
  const clean = sanitizePhoneNumber(num);
  if (clean.startsWith('9665') && clean.length === 12) {
    return `0${clean.slice(3)}`;
  }
  return num;
}

/**
 * Generates an official WhatsApp booking URL with localized pre-filled message.
 * Returns null if no official number is configured yet.
 * URL format: https://wa.me/966553543192?text=...
 */
export function getWhatsAppBookingUrl(lang: 'ar' | 'en' = 'ar', serviceName?: string): string | null {
  if (!isWhatsAppConfigured()) {
    return null;
  }

  const cleanNumber = normalizeWhatsAppNumber(siteConfig.contact.whatsapp);
  if (!cleanNumber) {
    return null;
  }

  let message = '';

  if (lang === 'ar') {
    message = serviceName
      ? `مرحباً ألور سبا، أود الاستفسار وحجز موعد لخدمة (${serviceName}).`
      : 'مرحباً ألور سبا، أود الاستفسار وحجز موعد لديكم.';
  } else {
    message = serviceName
      ? `Hello ALOR SPA, I would like to inquire about booking an appointment for (${serviceName}).`
      : 'Hello ALOR SPA, I would like to inquire about booking an appointment.';
  }

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates the official telephone number formatted according to standard
 * Schema.org E.164 international format (e.g. +966553543192).
 */
export function getSchemaTelephone(): string | undefined {
  if (siteConfig.contact.phone) {
    const clean = sanitizePhoneNumber(siteConfig.contact.phone);
    return clean.startsWith('+') ? clean : `+${clean}`;
  }
  if (isWhatsAppConfigured()) {
    const clean = normalizeWhatsAppNumber(siteConfig.contact.whatsapp);
    return `+${clean}`;
  }
  return undefined;
}
