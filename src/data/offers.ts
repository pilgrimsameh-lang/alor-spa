/**
 * ALOR SPA — Official Promotional & Seasonal Offerings Data
 * Authoritative source synced with SQLite relational database.
 * Total Offers: 3
 */

export interface OfferItem {
  id: string;
  slug: string;
  badge?: {
    ar: string;
    en: string;
  };
  title: {
    ar: string;
    en: string;
  };
  subtitle: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  includes: {
    ar: string[];
    en: string[];
  };
  price: {
    amount?: number;
    currency: string;
    isConfirmed: boolean;
    display: {
      ar: string;
      en: string;
    };
  };
  duration?: {
    minutes?: number;
    display: {
      ar: string;
      en: string;
    };
  };
  image?: string;
  isFeatured?: boolean;
}

export const activeOffers: OfferItem[] = [
  {
    "id": "offer-relax-30",
    "slug": "offer-relax-30",
    "badge": {
      "ar": "عرض مميز",
      "en": "Special Offer"
    },
    "title": {
      "ar": "مساج استرخاء 30 دقيقة",
      "en": "30-Minute Relaxation Massage"
    },
    "subtitle": {
      "ar": "جلسة سريعة ومركزة لتجديد النشاط والحيوية",
      "en": "Quick restorative break to recharge vitality"
    },
    "description": {
      "ar": "جلسة مساج استرخائي سريعة ومركزة لتجديد النشاط وتخفيف التوتر في 30 دقيقة.",
      "en": "A quick, focused 30-minute relaxation massage designed to refresh vitality and release daily stress."
    },
    "includes": {
      "ar": [
        "مساج استرخائي مركز 30 دقيقة",
        "زيوت عطرية طبيعية مهدئة"
      ],
      "en": [
        "30-minute focused relaxation massage",
        "Calming natural essential oils"
      ]
    },
    "price": {
      "amount": 96,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "96 ر.س",
        "en": "96 SAR"
      }
    },
    "duration": {
      "minutes": 30,
      "display": {
        "ar": "30 دقيقة",
        "en": "30 Minutes"
      }
    },
    "image": "/images/services/relaxation-massage.jpg",
    "isFeatured": true
  },
  {
    "id": "offer-relax-30-pedi-mani",
    "slug": "offer-relax-30-pedi-mani",
    "badge": {
      "ar": "باقة التوفير",
      "en": "Value Combo"
    },
    "title": {
      "ar": "مساج استرخاء 30 دقيقة + بدكير ومنكير",
      "en": "30-Min Relaxation Massage + Pedicure & Manicure"
    },
    "subtitle": {
      "ar": "عناية مزدوجة تجمع بين هدوء التدليك ونضارة الأظافر",
      "en": "Dual care combining soothing bodywork with flawless nail grooming"
    },
    "description": {
      "ar": "تجربة عناية مزدوجة تجمع بين مساج استرخائي لمدة 30 دقيقة وجلسة بدكير ومنكير متكاملة لليدين والقدمين.",
      "en": "A dual wellness experience combining a 30-minute relaxation massage with a complete manicure and pedicure treatment."
    },
    "includes": {
      "ar": [
        "مساج استرخاء 30 دقيقة",
        "بدكير ومنكير فاخر لليدين والقدمين"
      ],
      "en": [
        "30-minute relaxation massage",
        "Luxury manicure & pedicure for hands and feet"
      ]
    },
    "price": {
      "amount": 249,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "249 ر.س",
        "en": "249 SAR"
      }
    },
    "image": "/images/services/pedicure-manicure.jpg",
    "isFeatured": true
  },
  {
    "id": "offer-relax-30-moroccan-bath",
    "slug": "offer-relax-30-moroccan-bath",
    "badge": {
      "ar": "الأكثر طلباً",
      "en": "Most Popular"
    },
    "title": {
      "ar": "مساج استرخاء 30 دقيقة + حمام مغربي",
      "en": "30-Min Relaxation Massage + Moroccan Bath"
    },
    "subtitle": {
      "ar": "توليفة الدفء والنقاء الملكي للاستجمام التام",
      "en": "Royal warming purification combo for ultimate unwinding"
    },
    "description": {
      "ar": "باقة الدفء والراحة التي تجمع بين الحمام المغربي التقليدي بالصابون البلدي ومساج استرخائي 30 دقيقة.",
      "en": "A warming, rejuvenating package combining traditional Moroccan hammam with black soap and a 30-minute relaxation massage."
    },
    "includes": {
      "ar": [
        "مساج استرخاء 30 دقيقة",
        "حمام مغربي تقليدي فاخر"
      ],
      "en": [
        "30-minute relaxation massage",
        "Luxury traditional Moroccan bath"
      ]
    },
    "price": {
      "amount": 219,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "219 ر.س",
        "en": "219 SAR"
      }
    },
    "image": "/images/services/moroccan-bath.jpg",
    "isFeatured": true
  }
];
