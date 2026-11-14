/**
 * ALOR SPA — i18n Utility Functions
 */

import { ui, defaultLang, type Language, type TranslationKey } from './translations';

/**
 * Extract the language from a URL pathname.
 * Default locale (ar) has no prefix; English uses /en/.
 */
export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Language;
  return defaultLang;
}

/**
 * Get the text direction for a language.
 */
export function getDirection(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Get a translation function for the given language.
 */
export function useTranslations(lang: Language) {
  return function t(key: TranslationKey): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui[defaultLang] as Record<string, string>)[key] ?? (key as string);
  };
}

/**
 * Build a localized URL path or section link.
 * Arabic (default) has no prefix. English gets /en/ prefix.
 */
export function getLocalizedPath(path: string, lang: Language): string {
  // If it's a pure anchor on the homepage, e.g. "#services"
  if (path.startsWith('#')) {
    return lang === defaultLang ? path : `/en/${path}`;
  }

  // Ensure leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (lang === defaultLang) {
    return cleanPath;
  }

  // Prevent double /en/
  if (cleanPath === '/') {
    return '/en/';
  }

  if (cleanPath.startsWith('/en/')) {
    return cleanPath;
  }

  return `/en${cleanPath}`;
}

/**
 * Get the alternate language.
 */
export function getAlternateLang(lang: Language): Language {
  return lang === 'ar' ? 'en' : 'ar';
}
