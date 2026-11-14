/**
 * ALOR SPA — Official Packages & Special Experiences Data
 * Authoritative source synced with SQLite relational database.
 * Total Standard Packages: 3
 * Total Special Packages: 4
 * Total Massage Menu Types: 6
 */

export interface PackageOptionItem {
  id: string;
  slug: string;
  title: {
    ar: string;
    en: string;
  };
  description?: {
    ar: string;
    en: string;
  };
  price: {
    amount: number;
    currency: string;
    display: {
      ar: string;
      en: string;
    };
  };
}

export interface PackageItem {
  id: string;
  slug: string;
  packageType: 'standard' | 'special';
  title: {
    ar: string;
    en: string;
  };
  subtitle?: {
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
  priceDisplay: {
    ar: string;
    en: string;
  };
  priceAmount?: number;
  badge?: {
    ar: string;
    en: string;
  };
  image?: string;
  options?: PackageOptionItem[];
}

export interface MassageVariantItem {
  durationMinutes: number;
  durationDisplay: {
    ar: string;
    en: string;
  };
  priceDisplay: {
    ar: string;
    en: string;
  };
  priceAmount: number;
}

export interface MassageTypeItem {
  id: string;
  slug: string;
  title: {
    ar: string;
    en: string;
  };
  subtitle?: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  variants: MassageVariantItem[];
}

export const standardPackages: PackageItem[] = [
  {
    "id": "pkg_relax_pedi_mani",
    "slug": "package-relax-pedicure-manicure",
    "packageType": "standard",
    "title": {
      "ar": "بكج مساج ريلاكس وبدكير ومنكير",
      "en": "Relax Massage & Pedicure-Manicure Package"
    },
    "subtitle": {
      "ar": "تناغم الاسترخاء والعناية الفائقة بأظافر اليدين والقدمين",
      "en": "A seamless blend of body unwinding and meticulous nail elegance"
    },
    "description": {
      "ar": "باقة استرخاء وعناية متكاملة تجمع بين جلسة مساج ريلاكس كاملة وبدكير ومنكير فاخر لليدين والقدمين.",
      "en": "A comprehensive pampering package pairing a full relaxation massage with a luxury manicure and pedicure."
    },
    "includes": {
      "ar": [
        "جلسة مساج ريلاكس كاملة",
        "بدكير ومنكير فاخر",
        "ضيافة مشروبات الأعشاب"
      ],
      "en": [
        "Full relaxation massage session",
        "Luxury pedicure & manicure",
        "Herbal wellness beverages"
      ]
    },
    "priceDisplay": {
      "ar": "296 ر.س",
      "en": "296 SAR"
    },
    "priceAmount": 296,
    "badge": {
      "ar": "بكج التوازن",
      "en": "Balance Package"
    },
    "image": "/images/services/relaxation-massage.jpg"
  },
  {
    "id": "pkg_relax_hammam",
    "slug": "package-relax-moroccan-bath",
    "packageType": "standard",
    "title": {
      "ar": "بكج مساج ريلاكس وحمام مغربي",
      "en": "Relax Massage & Moroccan Bath Package"
    },
    "subtitle": {
      "ar": "طقوس النقاء بالصابون البلدي مع انسيابية المساج الهادئ",
      "en": "Purifying black soap hammam paired with deeply calming bodywork"
    },
    "description": {
      "ar": "باقة النقاء والسكينة التي تدمج طقوس الحمام المغربي بالبخار والصابون البلدي مع جلسة مساج ريلاكس هادئة.",
      "en": "A purification ritual harmonizing steam Moroccan hammam with traditional black soap and a deeply calming relaxation massage."
    },
    "includes": {
      "ar": [
        "حمام مغربي فاخر بالصابون البلدي",
        "جلسة مساج ريلاكس هادئة",
        "ترطيب غني ونعومة فائقة"
      ],
      "en": [
        "Royal Moroccan hammam ritual",
        "Gentle relaxation massage",
        "Deep hydrating finish"
      ]
    },
    "priceDisplay": {
      "ar": "296 ر.س",
      "en": "296 SAR"
    },
    "priceAmount": 296,
    "badge": {
      "ar": "بكج النقاء",
      "en": "Purity Package"
    },
    "image": "/images/services/moroccan-bath.jpg"
  },
  {
    "id": "pkg_relax_pedi_mani_hammam",
    "slug": "package-relax-pedi-mani-moroccan-bath",
    "packageType": "standard",
    "title": {
      "ar": "بكج مساج ريلاكس وبدكير ومنكير وحمام مغربي",
      "en": "Relax Massage, Pedicure-Manicure & Moroccan Bath Package"
    },
    "subtitle": {
      "ar": "التجربة الملكية الثلاثية الشاملة للاستجمام والجمال",
      "en": "The definitive triple royal sanctuary experience"
    },
    "description": {
      "ar": "التجربة الملكية الشاملة التي تجمع خدمات السبا الأساسية الثلاث في جلسة استجمام متكاملة.",
      "en": "The ultimate royal spa journey bringing together all three signature treatments in one indulgent session."
    },
    "includes": {
      "ar": [
        "حمام مغربي ملكي كامل",
        "جلسة مساج ريلاكس",
        "بدكير ومنكير متكامل",
        "ضيافة خاصة"
      ],
      "en": [
        "Complete royal Moroccan bath",
        "Full relaxation massage",
        "Complete pedicure & manicure",
        "Private lounge service"
      ]
    },
    "priceDisplay": {
      "ar": "396 ر.س",
      "en": "396 SAR"
    },
    "priceAmount": 396,
    "badge": {
      "ar": "البكج الشامل",
      "en": "All-Inclusive"
    },
    "image": "/images/services/body-sculpting-drainage.jpg"
  }
];

export const specialPackages: PackageItem[] = [
  {
    "id": "pkg_special_gift",
    "slug": "special-gift-package",
    "packageType": "special",
    "title": {
      "ar": "باقة الإهداء",
      "en": "The Gifting Experience Package"
    },
    "subtitle": {
      "ar": "هدية راقية للتعبير عن المحبة والتقدير بلمسات السبا والورد",
      "en": "An exquisite gift of pure pampering paired with fresh florals"
    },
    "description": {
      "ar": "هدية مثالية لمن تحبين تعبّر عن التقدير والاهتمام مع تجربة استرخاء فاخرة وباقة ورد أنيقة.",
      "en": "A heartfelt gift to cherish someone special, featuring a relaxing spa day paired with a fresh flower bouquet."
    },
    "includes": {
      "ar": [
        "مساج استرخائي",
        "بدكير ومنكير",
        "باقة ورد أنيقة"
      ],
      "en": [
        "Relaxation massage",
        "Pedicure & manicure",
        "Fresh floral bouquet"
      ]
    },
    "priceDisplay": {
      "ar": "350 ر.س",
      "en": "350 SAR"
    },
    "priceAmount": 350,
    "badge": {
      "ar": "إهداء فاخر",
      "en": "Luxury Gifting"
    },
    "image": "/images/gallery/gallery-1.jpg",
    "options": []
  },
  {
    "id": "pkg_special_diamond",
    "slug": "special-diamond-package",
    "packageType": "special",
    "title": {
      "ar": "الباقة الماسية",
      "en": "The Diamond VIP Package"
    },
    "subtitle": {
      "ar": "أعلى درجات الدلال الملكي المتكامل لإطلالة استثنائية",
      "en": "The absolute pinnacle of VIP royal care and beauty"
    },
    "description": {
      "ar": "باقة الدلال الفائق الشاملة لكافة طقوس العناية والجمال الملكية لإطلالة ساحرة وشعور متجدد بالحيوية.",
      "en": "The pinnacle of luxury self-care covering all five signature beauty and bodywork rituals for total renewal."
    },
    "includes": {
      "ar": [
        "مساج استرخائي",
        "حمام مغربي",
        "استشوار",
        "شمع للوجه",
        "بدكير ومنكير"
      ],
      "en": [
        "Relaxation massage",
        "Royal Moroccan bath",
        "Hair styling blow-dry",
        "Facial waxing",
        "Pedicure & manicure"
      ]
    },
    "priceDisplay": {
      "ar": "599 ر.س",
      "en": "599 SAR"
    },
    "priceAmount": 599,
    "badge": {
      "ar": "الأكثر تميزاً",
      "en": "VIP Signature"
    },
    "image": "/images/gallery/gallery-2.jpg",
    "options": []
  },
  {
    "id": "pkg_special_complete_care",
    "slug": "special-complete-care-package",
    "packageType": "special",
    "title": {
      "ar": "باقة العناية المتكاملة",
      "en": "Complete Care Package"
    },
    "subtitle": {
      "ar": "جلسات مساج مضاعفة وعناية متقنة بالأظافر للراحة التامة",
      "en": "Dual massage therapy paired with precision nail beautification"
    },
    "description": {
      "ar": "باقة صُممت لتقديم عناية مضاعفة وممتدة مع جلستي مساج متتاليتين وجلسة بدكير ومنكير متألقة.",
      "en": "Designed for deep rejuvenation featuring two massage sessions combined with meticulous nail grooming."
    },
    "includes": {
      "ar": [
        "جلستان مساج",
        "بدكير ومنكير"
      ],
      "en": [
        "Two massage sessions",
        "Pedicure & manicure"
      ]
    },
    "priceDisplay": {
      "ar": "330 ر.س",
      "en": "330 SAR"
    },
    "priceAmount": 330,
    "badge": {
      "ar": "عناية مضاعفة",
      "en": "Dual Care"
    },
    "image": "/images/gallery/gallery-5.jpg",
    "options": []
  },
  {
    "id": "pkg_special_friends",
    "slug": "special-friends-package",
    "packageType": "special",
    "title": {
      "ar": "باقة الصديقات",
      "en": "Friends Sanctuary Package"
    },
    "subtitle": {
      "ar": "لحظات استجمام مشتركة بخيارات حجز منفصلة تلبي رغباتكما",
      "en": "Shared sanctuary moments with distinct individual choices"
    },
    "description": {
      "ar": "باقة مميزة لمشاركة أجواء الاستجمام مع صديقتكِ، تتضمن ثلاثة خيارات منفصلة تلبي رغباتكما المختلفة دون دمج الأسعار.",
      "en": "A special experience to share serene moments with your closest friend, featuring three distinct options tailored to your preference."
    },
    "includes": {
      "ar": [
        "أجواء استجمام مشتركة",
        "ثلاثة خيارات حجز منفصلة",
        "ضيافة خاصة"
      ],
      "en": [
        "Shared sanctuary ambiance",
        "Three distinct booking options",
        "Signature hospitality"
      ]
    },
    "priceDisplay": {
      "ar": "خيارات تبدأ من 259 ر.س",
      "en": "Options from 259 SAR"
    },
    "badge": {
      "ar": "لحظات مشتركة",
      "en": "Shared Moments"
    },
    "image": "/images/gallery/gallery-4.jpg",
    "options": [
      {
        "id": "opt_friends_hammam",
        "slug": "friends-option-moroccan-bath",
        "title": {
          "ar": "خيار الحمام المغربي",
          "en": "Moroccan Bath Option"
        },
        "description": {
          "ar": "طقوس الحمام المغربي الفاخر بالصابون البلدي والبخار الدافئ لصديقتين في أجواء ملؤها الخصوصية والراحة.",
          "en": "Royal Moroccan bath hammam experience with authentic black soap and steam for two companions."
        },
        "price": {
          "amount": 259,
          "currency": "SAR",
          "display": {
            "ar": "259 ر.س",
            "en": "259 SAR"
          }
        }
      },
      {
        "id": "opt_friends_pedi",
        "slug": "friends-option-pedicure-manicure",
        "title": {
          "ar": "خيار البدكير والمنكير",
          "en": "Pedicure & Manicure Option"
        },
        "description": {
          "ar": "عناية وتجميل متكامل للأظافر واليدين والقدمين لكِ ولصديقتكِ بأدوات معقمة وزبدة الشيا الطبيعية.",
          "en": "Complete nail beautification and hand & foot hydration with sterilized tools for you and your friend."
        },
        "price": {
          "amount": 279,
          "currency": "SAR",
          "display": {
            "ar": "279 ر.س",
            "en": "279 SAR"
          }
        }
      },
      {
        "id": "opt_friends_relax",
        "slug": "friends-option-relax-massage",
        "title": {
          "ar": "خيار المساج الاسترخائي",
          "en": "Relaxation Massage Option"
        },
        "description": {
          "ar": "جلسة تدليك استرخائي هادئة بالزيوت العطرية النقية لفك الإرهاق والاستمتاع بلحظات صفاء مشتركة.",
          "en": "Soothing relaxation massage sessions with natural aromatic oils for two companions to unwind together."
        },
        "price": {
          "amount": 299,
          "currency": "SAR",
          "display": {
            "ar": "299 ر.س",
            "en": "299 SAR"
          }
        }
      }
    ]
  }
];

export const massageMenuCatalog: MassageTypeItem[] = [
  {
    "id": "msg_relaxing",
    "slug": "menu-relaxing-massage",
    "title": {
      "ar": "المساج الاسترخائي",
      "en": "Relaxing Massage"
    },
    "subtitle": {
      "ar": "هدوء وانسيابية عميقة للتخلص من الإجهاد اليومي",
      "en": "Gentle restorative flow to dissolve everyday fatigue"
    },
    "description": {
      "ar": "تدليك استرخائي كامل بانسيابية لطيفة وزيوت عطرية مهدئة لتهدئة الأعصاب وتحسين جودة النوم.",
      "en": "A full-body soothing massage with gentle rhythmic strokes and calming aromatics to ease mental tension and promote restful sleep."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "175 ر.س",
          "en": "175 SAR"
        },
        "priceAmount": 175
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "275 ر.س",
          "en": "275 SAR"
        },
        "priceAmount": 275
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "375 ر.س",
          "en": "375 SAR"
        },
        "priceAmount": 375
      }
    ]
  },
  {
    "id": "msg_therapeutic",
    "slug": "menu-therapeutic-massage",
    "title": {
      "ar": "المساج العلاجي",
      "en": "Therapeutic Massage"
    },
    "subtitle": {
      "ar": "عناية تخصصية لمناطق التوتر والإجهاد العضلي",
      "en": "Specialized clinical care targeting myofascial tension zones"
    },
    "description": {
      "ar": "مساج تخصصي يستهدف النقاط العضلية الحيوية ومناطق التوتر لتخفيف الآلام والإجهاد العضلي.",
      "en": "A specialized clinical bodywork targeting critical muscular triggers and accumulated tension to relieve physical discomfort."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "189 ر.س",
          "en": "189 SAR"
        },
        "priceAmount": 189
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "289 ر.س",
          "en": "289 SAR"
        },
        "priceAmount": 289
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "389 ر.س",
          "en": "389 SAR"
        },
        "priceAmount": 389
      }
    ]
  },
  {
    "id": "msg_deep_tissue",
    "slug": "menu-deep-tissue-massage",
    "title": {
      "ar": "مساج الأنسجة العميقة",
      "en": "Deep Tissue Massage"
    },
    "subtitle": {
      "ar": "ضغط موجه وبطيء لتحرير العقد العضلية والتيبس",
      "en": "Deep deliberate pressure releasing chronic knots and fascia stiffness"
    },
    "description": {
      "ar": "تدليك بضغط مدروس وعميق لاختراق طبقات العضلات الداخلية وتفكيك الالتصاقات والتيبس المزمن.",
      "en": "Firm, deliberate pressure reaching deeper muscle layers and fascia to release chronic contractions and stiffness."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "199 ر.س",
          "en": "199 SAR"
        },
        "priceAmount": 199
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "299 ر.س",
          "en": "299 SAR"
        },
        "priceAmount": 299
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "399 ر.س",
          "en": "399 SAR"
        },
        "priceAmount": 399
      }
    ]
  },
  {
    "id": "msg_prenatal",
    "slug": "menu-prenatal-postnatal-massage",
    "title": {
      "ar": "مساج قبل / بعد الولادة",
      "en": "Pre & Post Natal Massage"
    },
    "subtitle": {
      "ar": "عناية فائقة للأمهات بوضعيات مريحة وداعمة",
      "en": "Nurturing care for mothers in comforting, supportive postures"
    },
    "description": {
      "ar": "عناية خاصة وفاخرة بالأمهات في وضعيات آمنة ومريحة لتخفيف آلام الظهر وتورم القدمين واستعادة راحة الجسم.",
      "en": "Gentle, caring therapy tailored specifically for expecting and new mothers in supportive postures to relieve backache and leg swelling."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "199 ر.س",
          "en": "199 SAR"
        },
        "priceAmount": 199
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "299 ر.س",
          "en": "299 SAR"
        },
        "priceAmount": 299
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "399 ر.س",
          "en": "399 SAR"
        },
        "priceAmount": 399
      }
    ]
  },
  {
    "id": "msg_head_shoulders",
    "slug": "menu-head-shoulders-massage",
    "title": {
      "ar": "مساج الرأس والأكتاف",
      "en": "Head & Shoulders Massage"
    },
    "subtitle": {
      "ar": "تركيز عميق لإزالة التوتر العصبي وصداع الإجهاد",
      "en": "Focused relief to dissolve cranial tension and mental fatigue"
    },
    "description": {
      "ar": "جلسة تدليك مركزة لأعلى الظهر والكتفين وفروة الرأس لتخفيف الصداع والإجهاد العصبي وتحفيز تدفق الدم.",
      "en": "A targeted therapeutic focus on the upper back, shoulders, neck, and scalp to dissipate tension headaches and mental fatigue."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "145 ر.س",
          "en": "145 SAR"
        },
        "priceAmount": 145
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "245 ر.س",
          "en": "245 SAR"
        },
        "priceAmount": 245
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "345 ر.س",
          "en": "345 SAR"
        },
        "priceAmount": 345
      }
    ]
  },
  {
    "id": "msg_foot",
    "slug": "menu-foot-massage",
    "title": {
      "ar": "مساج الأقدام",
      "en": "Foot Massage"
    },
    "subtitle": {
      "ar": "تدليك انعكاسي لتنشيط مراكز الطاقة وإزالة إجهاد المشي",
      "en": "Restorative reflexology releasing walking fatigue and stimulating energy channels"
    },
    "description": {
      "ar": "تدليك انعكاسي عميق للقدمين والساقين يزيل التعب والإرهاق وينشط مراكز الطاقة والدورة الدموية في كامل الجسم.",
      "en": "Deep foot reflexology and lower leg relief that melts away walking fatigue and stimulates vital meridian pathways throughout the body."
    },
    "variants": [
      {
        "durationMinutes": 60,
        "durationDisplay": {
          "ar": "60 دقيقة",
          "en": "60 Minutes"
        },
        "priceDisplay": {
          "ar": "145 ر.س",
          "en": "145 SAR"
        },
        "priceAmount": 145
      },
      {
        "durationMinutes": 90,
        "durationDisplay": {
          "ar": "90 دقيقة",
          "en": "90 Minutes"
        },
        "priceDisplay": {
          "ar": "245 ر.س",
          "en": "245 SAR"
        },
        "priceAmount": 245
      },
      {
        "durationMinutes": 120,
        "durationDisplay": {
          "ar": "120 دقيقة",
          "en": "120 Minutes"
        },
        "priceDisplay": {
          "ar": "345 ر.س",
          "en": "345 SAR"
        },
        "priceAmount": 345
      }
    ]
  }
];
