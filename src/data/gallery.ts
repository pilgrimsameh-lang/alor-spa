/**
 * ALOR SPA — Gallery Data
 *
 * High-resolution interior, treatment, and ambiance photography.
 * Ready for replacement with authentic on-site ALOR SPA photos.
 */

export interface GalleryImage {
  id: string;
  src: string;
  alt: {
    ar: string;
    en: string;
  };
  title: {
    ar: string;
    en: string;
  };
  category: 'ambiance' | 'treatment' | 'rituals';
  categoryLabel: {
    ar: string;
    en: string;
  };
}

export const galleryImages: GalleryImage[] = [
  {
    id: 'gallery-1',
    src: '/images/gallery/gallery-1.jpg',
    alt: {
      ar: 'أجواء جناح العناية والاسترخاء الهادئ',
      en: 'Tranquil spa treatment suite ambiance',
    },
    title: {
      ar: 'أجنحة الاسترخاء الخاصة',
      en: 'Private Treatment Sanctuary',
    },
    category: 'treatment',
    categoryLabel: {
      ar: 'أجنحة العلاج',
      en: 'Treatment Suites',
    },
  },
  {
    id: 'gallery-2',
    src: '/images/gallery/gallery-2.jpg',
    alt: {
      ar: 'صالة الاستقبال والراحة بلمسات أنيقة',
      en: 'Elegant spa reception and lounge',
    },
    title: {
      ar: 'ردهة الاستقبال والضيافة',
      en: 'Reception & Welcome Lounge',
    },
    category: 'ambiance',
    categoryLabel: {
      ar: 'الأجواء',
      en: 'Ambiance',
    },
  },
  {
    id: 'gallery-3',
    src: '/images/gallery/gallery-3.jpg',
    alt: {
      ar: 'جلسة تدليك استرخائي بالزيوت العطرية',
      en: 'Aromatherapy massage session',
    },
    title: {
      ar: 'طقوس التدليك والعناية',
      en: 'Massage Rituals',
    },
    category: 'rituals',
    categoryLabel: {
      ar: 'الطقوس',
      en: 'Rituals',
    },
  },
  {
    id: 'gallery-4',
    src: '/images/gallery/gallery-4.jpg',
    alt: {
      ar: 'ركن المشروبات العشبية المنعشة للاسترخاء',
      en: 'Herbal tea corner for post-treatment refreshment',
    },
    title: {
      ar: 'استراحة الشاي العشبي والضيافة',
      en: 'Herbal Tea & Relaxation Corner',
    },
    category: 'ambiance',
    categoryLabel: {
      ar: 'الأجواء',
      en: 'Ambiance',
    },
  },
  {
    id: 'gallery-5',
    src: '/images/gallery/gallery-5.jpg',
    alt: {
      ar: 'إضاءة دافئة وشموع تمنح السكينة والهدوء',
      en: 'Warm candlelit relaxation setting',
    },
    title: {
      ar: 'أجواء السكينة والهدوء',
      en: 'Serene Warm Ambiance',
    },
    category: 'ambiance',
    categoryLabel: {
      ar: 'الأجواء',
      en: 'Ambiance',
    },
  },
  {
    id: 'gallery-6',
    src: '/images/gallery/gallery-6.jpg',
    alt: {
      ar: 'أحجار البازلت الساخنة والزيوت الطبيعية',
      en: 'Hot basalt stones and natural treatment oils',
    },
    title: {
      ar: 'تفاصيل العلاجات الطبيعية',
      en: 'Natural Treatment Elements',
    },
    category: 'treatment',
    categoryLabel: {
      ar: 'أجنحة العلاج',
      en: 'Treatment Suites',
    },
  },
  {
    id: 'gallery-7',
    src: '/images/gallery/gallery-7.jpg',
    alt: {
      ar: 'أجواء الحمام المغربي الفاخر والعناية الملكية بالبشرة والجسم',
      en: 'Authentic Moroccan hammam ambiance and royal body care',
    },
    title: {
      ar: 'طقوس الحمام المغربي الملكي',
      en: 'Royal Moroccan Hammam Rituals',
    },
    category: 'rituals',
    categoryLabel: {
      ar: 'الطقوس',
      en: 'Rituals',
    },
  },
  {
    id: 'gallery-8',
    src: '/images/gallery/gallery-8.jpg',
    alt: {
      ar: 'تجهيزات العناية باليدين والقدمين في أجواء أنثوية راقية',
      en: 'Bespoke manicure and pedicure sanctuary',
    },
    title: {
      ar: 'ركن العناية الفاخرة بالأظافر',
      en: 'Artisan Nail Care Lounge',
    },
    category: 'treatment',
    categoryLabel: {
      ar: 'أجنحة العلاج',
      en: 'Treatment Suites',
    },
  },
  {
    id: 'gallery-9',
    src: '/images/gallery/gallery-9.jpg',
    alt: {
      ar: 'تفاصيل الديكور الدافئ والإضاءة الهادئة للاسترخاء والخصوصية',
      en: 'Warm ambient lighting and serene private sanctuary',
    },
    title: {
      ar: 'ملاذ السكينة والخصوصية التامة',
      en: 'Sanctuary of Serenity & Total Privacy',
    },
    category: 'ambiance',
    categoryLabel: {
      ar: 'الأجواء',
      en: 'Ambiance',
    },
  },
];
