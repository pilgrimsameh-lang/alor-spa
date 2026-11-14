/**
 * ALOR SPA — Guest Impressions & Testimonials Data
 *
 * Prepared for real, verified client feedback.
 * No fake testimonials or fabricated ratings are added.
 */

export interface TestimonialItem {
  id: string;
  author: string;
  title?: {
    ar: string;
    en: string;
  };
  quote: {
    ar: string;
    en: string;
  };
  service?: {
    ar: string;
    en: string;
  };
  date?: string;
  rating?: number;
}

/**
 * Array of verified client testimonials.
 * Empty by default so that no fake reviews are displayed.
 * Real reviews will be populated upon business client authorization.
 */
export const verifiedTestimonials: TestimonialItem[] = [];
