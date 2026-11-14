/**
 * ALOR SPA — Official Service Offerings Data
 * Authoritative source synced with SQLite relational database.
 * Total Services: 9
 */

export interface ServiceStep {
  step: string;
  title: string;
  description: string;
}

export interface ServicePrice {
  amount?: number;
  currency?: string;
  isConfirmed: boolean;
  display: {
    ar: string;
    en: string;
  };
  note?: {
    ar: string;
    en: string;
  };
}

export interface ServiceDuration {
  minutes?: number;
  isConfirmed: boolean;
  display: {
    ar: string;
    en: string;
  };
  note?: {
    ar: string;
    en: string;
  };
}

export interface ServiceItem {
  id: string;
  slug: string;
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
  detailedDescription: {
    ar: string[];
    en: string[];
  };
  image: string;
  imageAlt: {
    ar: string;
    en: string;
  };
  category: 'massage' | 'bath' | 'beauty' | 'wellness';
  isSignature?: boolean;
  price: ServicePrice;
  duration: ServiceDuration;
  features: {
    ar: string[];
    en: string[];
  };
  benefits: {
    ar: string[];
    en: string[];
  };
  steps: {
    ar: ServiceStep[];
    en: ServiceStep[];
  };
  includes: {
    ar: string[];
    en: string[];
  };
  suitability: {
    ar: string;
    en: string;
  };
  advisory: {
    ar: string;
    en: string;
  };
  seo: {
    title: {
      ar: string;
      en: string;
    };
    description: {
      ar: string;
      en: string;
    };
  };
}

export const servicesData: ServiceItem[] = [
  {
    "id": "relaxation-massage",
    "slug": "relaxation-massage",
    "title": {
      "ar": "مساج ريلاكس",
      "en": "Relax Massage"
    },
    "subtitle": {
      "ar": "هدوء وانسيابية عميقة لتجديد الطاقة والسكينة",
      "en": "Deep tranquil flow for serene mind-body rejuvenation"
    },
    "description": {
      "ar": "مساج استرخائي ريلاكس بالرياض بزيوت عطرية طبيعية يساعد على التخلص من الإجهاد اليومي وتحسين الدورة الدموية واستعادة الراحة الذهنية والجسدية.",
      "en": "A soothing relaxation massage in Riyadh using natural essential oils designed to relieve daily stress, improve circulation, and restore mental and physical harmony."
    },
    "detailedDescription": {
      "ar": [
        "تجربة استرخاء فاخرة في أرقى سبا نسائي بالرياض تعتمد على ضربات انسيابية لطيفة وضغط هادئ يزيل التوتر العضلي برقة.",
        "تُستخدم في الجلسة زيوت طبيعية نقية ذات روائح عطرية آسرة تمنحكِ شعوراً بالراحة والانتعاش طوال اليوم."
      ],
      "en": [
        "A luxurious women's relaxation ritual in Riyadh employing gentle rhythmic strokes and soothing pressure to melt away muscular stress.",
        "Enriched with botanical essential oils delivering an exquisite aromatic journey that restores natural vitality."
      ]
    },
    "image": "/images/services/relaxation-massage.jpg",
    "imageAlt": {
      "ar": "جلسة مساج ريلاكس استرخائي نسائي في ألور سبا بالرياض",
      "en": "Women relaxation massage therapy session at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": true,
    "price": {
      "amount": 149,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "149 ر.س",
        "en": "149 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "زيوت عطرية طبيعية مهدئة",
        "بيئة هادئة وخصوصية تامة",
        "أخصائيات تدليك ذوات خبرة"
      ],
      "en": [
        "Natural calming essential oils",
        "Tranquil private ambiance",
        "Certified expert therapists"
      ]
    },
    "benefits": {
      "ar": [
        "تخفيف التوتر العصبي والإرهاق",
        "تحسين تدفق الدورة الدموية",
        "تعزيز جودة النوم والاسترخاء"
      ],
      "en": [
        "Relieves nervous tension & fatigue",
        "Enhances blood circulation",
        "Promotes deep restful sleep"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "الاستقبال والتقييم",
          "description": "استقبال فاخر وتحديد مستوى الضغط المفضل."
        },
        {
          "step": "02",
          "title": "التدليك الانسيابي",
          "description": "تطبيق الزيوت العطرية بحركات دائرية انسيابية متناغمة."
        },
        {
          "step": "03",
          "title": "التهدئة والراحة",
          "description": "استراحة هادئة مع مشروب عشبي دافئ."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Welcome & Consultation",
          "description": "Tailoring pressure preferences and essential oils."
        },
        {
          "step": "02",
          "title": "Rhythmic Bodywork",
          "description": "Gliding rhythmic strokes harmonizing the entire body."
        },
        {
          "step": "03",
          "title": "Post-Treatment Refresh",
          "description": "Quiet resting period with warm herbal tea."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة مساج ريلاكس كاملة",
        "زيوت عطرية فاخرة",
        "ضيافة المشروبات العشبية"
      ],
      "en": [
        "Full relax massage session",
        "Premium aromatherapy oils",
        "Herbal beverage hospitality"
      ]
    },
    "suitability": {
      "ar": "مناسب لجميع السيدات في الرياض الباحثات عن الراحة والاستجمام والتخلص من ضغوط العمل والحياة اليومية.",
      "en": "Ideal for women in Riyadh seeking tranquil recovery from daily routine and mental fatigue."
    },
    "advisory": {
      "ar": "يُرجى إبلاغ الأخصائية في حال وجود حمل أو حساسية جلدية معينة قبل بدء الجلسة.",
      "en": "Please inform your therapist of pregnancy or skin sensitivities before the session."
    },
    "seo": {
      "title": {
        "ar": "مساج ريلاكس بالرياض | أفضل مساج استرخائي نسائي — ألور سبا",
        "en": "Relaxation Massage in Riyadh | Luxury Women Spa — ALOR SPA"
      },
      "description": {
        "ar": "احجزي جلسة مساج ريلاكس استرخائي في الرياض لدى ألور سبا. تدليك هادئ بزيوت عطرية طبيعية لتخفيف التوتر والإجهاد واستعادة النشاط في بيئة نسائية تتسم بالخصوصية.",
        "en": "Book a soothing relaxation massage in Riyadh at ALOR SPA. Gentle aromatherapy massage designed for women to relieve stress and renew energy in complete privacy."
      }
    }
  },
  {
    "id": "integrated-4tech-massage",
    "slug": "integrated-4tech-massage",
    "title": {
      "ar": "مساج متكامل بأربع تقنيات مختلفة (أحجار، أقدام، ريلاكس، سيتايشو)",
      "en": "Integrated 4-Technique Massage (Hot Stone, Foot, Relax, Seitai-sho)"
    },
    "subtitle": {
      "ar": "توليفة متكاملة من أربع تقنيات تدليك عالمية لإعادة الحيوية الشاملة",
      "en": "A masterful harmony of four modalities for total holistic renewal"
    },
    "description": {
      "ar": "تجربة مساج متكامل يجمع 4 تقنيات بالرياض في ألور سبا: دفء الأحجار الساخنة وتدليك الأقدام ومساج ريلاكس وتقنية السيتايشو لتوازن وحيوية الجسم.",
      "en": "A unique integrated massage experience in Riyadh harmonizing four distinct modalities: soothing hot stones, revitalizing foot reflexology, calming relaxation, and balancing Seitai-sho."
    },
    "detailedDescription": {
      "ar": [
        "ابتكرت خبيرات ألور سبا في الرياض هذه الجلسة الجامعة لتقديم أقصى درجات الفائدة والاستجمام في آن واحد.",
        "تدمج الجلسة بين انسيابية الريلاكس، وعمق حرارة أحجار البازلت، وتدليك منعكسات القدمين، وتوازن السيتايشو الشرقي."
      ],
      "en": [
        "Designed by ALOR SPA master therapists in Riyadh to deliver multi-dimensional wellness and peak relaxation.",
        "Blends fluid relaxation strokes, grounding volcanic heat, targeted foot reflexology, and Seitai-sho balancing."
      ]
    },
    "image": "/images/services/relaxation-massage.jpg",
    "imageAlt": {
      "ar": "جلسة مساج متكامل بأربع تقنيات تدليك نسائية في ألور سبا الرياض",
      "en": "Integrated 4-technique massage treatment for women at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": true,
    "price": {
      "amount": 159,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "159 ر.س",
        "en": "159 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "أربع تقنيات في جلسة واحدة",
        "أحجار بازلت بركانية دافئة",
        "تقنية سيتايشو اليابانية"
      ],
      "en": [
        "Four techniques in one ritual",
        "Warm volcanic basalt stones",
        "Japanese Seitai-sho alignment"
      ]
    },
    "benefits": {
      "ar": [
        "فك التشنجات العضلية العميقة",
        "تنشيط مسارات الطاقة الحيوية",
        "شعور متكامل بالخفة والراحة"
      ],
      "en": [
        "Releases deep muscular contractions",
        "Restores vital energy channels",
        "Overall lightness & revitalization"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "مساج الريلاكس التمهيدي",
          "description": "تهدئة الجسم وتهيئته بالزيوت الدافئة."
        },
        {
          "step": "02",
          "title": "الأحجار وتدليك الأقدام",
          "description": "تطبيق أحجار البازلت الساخنة مع مساج القدمين الانعكاسي."
        },
        {
          "step": "03",
          "title": "تقنية السيتايشو التوازنية",
          "description": "حركات توازنية لتحرير المفاصل ومحاذاة الطاقة."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Relaxation Foundation",
          "description": "Soothing the body with warm botanical oils."
        },
        {
          "step": "02",
          "title": "Stones & Foot Reflexology",
          "description": "Heated basalt stones with stimulating foot pressure."
        },
        {
          "step": "03",
          "title": "Seitai-sho Harmonization",
          "description": "Gentle structural balancing and tension release."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة المساج المتكامل",
        "استخدام أحجار البازلت",
        "ضيافة ألور سبا الخاصة"
      ],
      "en": [
        "Full integrated 4-technique session",
        "Basalt stones treatment",
        "ALOR SPA herbal hospitality"
      ]
    },
    "suitability": {
      "ar": "مثالي للسيدات في الرياض اللاتي يعانين من إرهاق جسدي عام ويبحثن عن تجربة استجمام عميقة ومتنوعة في مركز مساج نسائي متكامل.",
      "en": "Perfect for women in Riyadh experiencing generalized fatigue seeking a multifaceted, comprehensive spa treatment."
    },
    "advisory": {
      "ar": "يُنصح بعدم ممارسة أنشطة شاقة بعد الجلسة للاستمتاع بالاسترخاء العميق.",
      "en": "Restful activity is recommended following this intensive treatment."
    },
    "seo": {
      "title": {
        "ar": "مساج متكامل 4 تقنيات بالرياض (أحجار، أقدام، ريلاكس، سيتايشو) | ألور سبا",
        "en": "Integrated 4-Technique Massage in Riyadh | ALOR SPA Women Sanctuary"
      },
      "description": {
        "ar": "تجربة مساج متكامل يجمع 4 تقنيات عالمية بالرياض في ألور سبا: أحجار البازلت الساخنة، تدليك الأقدام، المساج الاسترخائي، وسيتايشو لتوازن وحيوية الجسم.",
        "en": "Experience our integrated 4-technique massage in Riyadh at ALOR SPA: hot stones, foot reflexology, relaxation massage, and Seitai-sho structural alignment for women."
      }
    }
  },
  {
    "id": "body-sculpting-drainage",
    "slug": "body-sculpting-drainage",
    "title": {
      "ar": "مساج نحت الجسم وتصريف السوائل",
      "en": "Body Contouring & Lymphatic Drainage Massage"
    },
    "subtitle": {
      "ar": "تقنية تخصصية لتنشيط التصريف اللمفاوي وشد القوام برقة",
      "en": "Specialized therapy promoting lymphatic flow and gentle contour firming"
    },
    "description": {
      "ar": "جلسة مساج نحت الجسم وتصريف السوائل اللمفاوي بالرياض لدى ألور سبا، تستهدف تقليل احتباس السوائل والمساعدة على شد القوام ونحت المنحنيات برقة.",
      "en": "A specialized body contouring and lymphatic drainage massage in Riyadh focused on stimulating circulation, reducing fluid retention, and gently firming natural contours."
    },
    "detailedDescription": {
      "ar": [
        "تعتمد هذه الجلسة في ألور سبا بالرياض على حركات ضغط إيقاعية موجهة نحو العقد اللمفاوية لتحفيز التخلص الطبيعي من السوائل المحتبسة.",
        "تساهم في تحسين ملمس البشرة وتعزيز الشعور بالخفة والرشاقة والحيوية للجسم بأكمله."
      ],
      "en": [
        "Applies precise rhythmic strokes directed along lymphatic pathways at ALOR SPA Riyadh to encourage natural fluid drainage.",
        "Enhances skin tone and contour definition while instilling a renewed sense of lightness throughout."
      ]
    },
    "image": "/images/services/body-sculpting-drainage.jpg",
    "imageAlt": {
      "ar": "مساج نحت الجسم وتصريف السوائل اللمفاوي للسيدات في ألور سبا بالرياض",
      "en": "Women body contouring and lymphatic drainage session at ALOR SPA Riyadh"
    },
    "category": "wellness",
    "isSignature": false,
    "price": {
      "amount": 169,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "169 ر.س",
        "en": "169 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "حركات تصريف لمفاوي مدروسة",
        "تركيز على مناطق احتباس السوائل",
        "منتجات طبيعية معززة للمرونة"
      ],
      "en": [
        "Clinical lymphatic pumping technique",
        "Focus on fluid retention zones",
        "Natural elasticity-enhancing lotions"
      ]
    },
    "benefits": {
      "ar": [
        "تقليل الانتفاخ واحتباس السوائل",
        "تحفيز الدورة اللمفاوية الطبيعية",
        "شد ودعم المنحنيات الطبيعية"
      ],
      "en": [
        "Reduces puffiness & fluid accumulation",
        "Stimulates sluggish lymphatic system",
        "Firms and refines natural contours"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "التقييم وتحديد الاحتياج",
          "description": "تحديد المناطق المستهدفة لاحتباس السوائل."
        },
        {
          "step": "02",
          "title": "التدليك اللمفاوي الإيقاعي",
          "description": "تطبيق تقنيات الضخ اللمفاوي باتجاه القنوات الرئيسية."
        },
        {
          "step": "03",
          "title": "الترطيب والشد",
          "description": "ترطيب البشرة بمركبات طبيعية مهدئة تدعم مرونة الجلد."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Assessment",
          "description": "Evaluating key target areas and circulation flow."
        },
        {
          "step": "02",
          "title": "Rhythmic Drainage",
          "description": "Gentle wave-like pumping encouraging fluid transit."
        },
        {
          "step": "03",
          "title": "Hydration & Toning",
          "description": "Soothing moisturizing finish optimizing skin elasticity."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة نحت الجسم والتصريف اللمفاوي",
        "مرطبات طبيعية مخصصة",
        "إرشادات العناية المنزلية"
      ],
      "en": [
        "Targeted body contouring session",
        "Specialized botanical lotions",
        "Post-treatment wellness tips"
      ]
    },
    "suitability": {
      "ar": "مثالي للسيدات في الرياض اللاتي يعانين من احتباس السوائل أو الشعور بثقل في الأطراف أو يرغبن في تحسين مظهر القوام والرشاقة.",
      "en": "Recommended for women in Riyadh experiencing water retention, limb heaviness, or seeking toned contours."
    },
    "advisory": {
      "ar": "يُنصح بالإكثار من شرب الماء النقي قبل الجلسة وبعدها لتعزيز كفاءة التصريف الطبيعي.",
      "en": "Drinking plenty of pure water before and after treatment is strongly advised."
    },
    "seo": {
      "title": {
        "ar": "مساج نحت الجسم وتصريف السوائل بالرياض | ألور سبا النسائي",
        "en": "Body Sculpting & Lymphatic Drainage Massage in Riyadh | ALOR SPA"
      },
      "description": {
        "ar": "جلسة مساج نحت الجسم وتصريف السوائل اللمفاوي بالرياض لدى ألور سبا. تحفيز التخلص من احتباس السوائل وشد القوام برقة بأيدي أخصائيات خبيرات.",
        "en": "Specialized body contouring and lymphatic drainage massage in Riyadh at ALOR SPA. Stimulate fluid release, reduce puffiness, and tone body contours in serene privacy."
      }
    }
  },
  {
    "id": "hot-stone-massage",
    "slug": "hot-stone-massage",
    "title": {
      "ar": "مساج الأحجار الساخنة",
      "en": "Hot Stone Massage"
    },
    "subtitle": {
      "ar": "دفء أحجار البازلت البركانية لتفكيك تشنج العضلات العميقة",
      "en": "Warm volcanic basalt stones melting away chronic muscle tightness"
    },
    "description": {
      "ar": "علاج حراري عميق بمساج الأحجار الساخنة في الرياض باستخدام أحجار البازلت البركانية الدافئة والزيوت الطبيعية لفك تشنج العضلات وبث الدفء والسكينة.",
      "en": "A deeply grounding thermal therapy in Riyadh employing heated volcanic basalt stones and natural nourishing oils to melt away deep muscular tension and induce tranquility."
    },
    "detailedDescription": {
      "ar": [
        "تُسخن أحجار البازلت الطبيعية في مركز ألور سبا بالرياض بدقة إلى درجات حرارة مريحة وتوضع على نقاط الطاقة الرئيسية في الظهر والكتفين.",
        "تتخلل الحرارة المهدئة ألياف العضلات المشدودة، مما يسمح للأخصائية بتدليك مريح يزيل الإجهاد تماماً."
      ],
      "en": [
        "Smooth volcanic stones are gently warmed at ALOR SPA Riyadh to comforting temperatures and placed along key energy centers.",
        "Radiant warmth penetrates deep into taut muscle fibers, releasing stiffness and restoring inner calmness."
      ]
    },
    "image": "/images/services/hot-stone-massage.jpg",
    "imageAlt": {
      "ar": "جلسة مساج الأحجار الساخنة البركانية للسيدات في ألور سبا بالرياض",
      "en": "Women hot stone massage therapy with heated basalt stones at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": true,
    "price": {
      "amount": 159,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "159 ر.س",
        "en": "159 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "أحجار بازلت طبيعية ملساء",
        "تدفئة حرارية علاجية مدروسة",
        "زيوت نباتية دافئة"
      ],
      "en": [
        "Polished basalt volcanic stones",
        "Controlled therapeutic heat",
        "Warm botanical massage oils"
      ]
    },
    "benefits": {
      "ar": [
        "فك التشنجات العضلية المستعصية",
        "تحسين الدورة الدموية والتغذية الخلوية",
        "تهدئة عميقة للجهاز العصبي"
      ],
      "en": [
        "Relieves stubborn chronic muscle knots",
        "Improves vascular microcirculation",
        "Deeply calms nervous system"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "تطبيق الزيوت الدافئة",
          "description": "تهيئة الظهر والكتفين بالزيوت العطرية الدافئة."
        },
        {
          "step": "02",
          "title": "تمسيد بالأحجار الساخنة",
          "description": "انزلاق الأحجار الدافئة بحركات متناسقة على طول العضلات."
        },
        {
          "step": "03",
          "title": "وضع الأحجار على نقاط التوازن",
          "description": "تثبيت الأحجار لبث الدفء المستمر والاسترخاء."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Warm Oil Application",
          "description": "Prepping back and shoulders with botanical essences."
        },
        {
          "step": "02",
          "title": "Stone Gliding Strokes",
          "description": "Smooth warm stones guided over taut muscle groups."
        },
        {
          "step": "03",
          "title": "Stationary Placement",
          "description": "Resting stones on chakra meridian points for thermal immersion."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة مساج الأحجار الساخنة",
        "أحجار البازلت المعقمة",
        "ضيافة الأعشاب المهدئة"
      ],
      "en": [
        "Full hot stone therapy session",
        "Sterilized basalt stones",
        "Calming herbal tea service"
      ]
    },
    "suitability": {
      "ar": "ممتاز للسيدات في الرياض اللاتي يعانين من تيبس عضلات الظهر وبرودة الأطراف والإجهاد البدني المتراكم والباحثات عن استرخاء حراري عميق.",
      "en": "Ideal for women in Riyadh suffering from chronic back stiffness, cold extremities, and muscular exhaustion."
    },
    "advisory": {
      "ar": "غير مناسب في حالات الحمى أو الالتهابات الجلدية الحادة أو الحمل.",
      "en": "Not recommended during fever, acute skin inflammation, or pregnancy without medical clearance."
    },
    "seo": {
      "title": {
        "ar": "مساج الأحجار الساخنة بالرياض | سبا نسائي فاخر — ألور سبا",
        "en": "Hot Stone Massage in Riyadh | Women's Luxury Spa — ALOR SPA"
      },
      "description": {
        "ar": "علاج حراري فاخر بمساج الأحجار الساخنة في الرياض لدى ألور سبا. أحجار بازلت بركانية دافئة وزيوت نباتية لتفكيك تشنج العضلات العميقة وبث الدفء والاسترخاء.",
        "en": "Experience volcanic hot stone massage therapy in Riyadh at ALOR SPA. Soothing heated basalt stones and warm essential oils to melt away deep muscular tension."
      }
    }
  },
  {
    "id": "deep-tissue-massage",
    "slug": "deep-tissue-massage",
    "title": {
      "ar": "مساج الأنسجة العميقة",
      "en": "Deep Tissue Massage"
    },
    "subtitle": {
      "ar": "تدليك مركز بالضغط البطيء لتحرير العقد العضلية والتيبس المزمن",
      "en": "Firm targeted pressure releasing persistent muscle knots and chronic stiffness"
    },
    "description": {
      "ar": "مساج الأنسجة العميقة بالرياض في ألور سبا: تدليك مكثف وموجه بالضغط البطيء والعميق لتحرير العقد العضلية وتخفيف التيبس المزمن في الظهر والرقبة والكتفين.",
      "en": "An intensive deep tissue massage in Riyadh applying deliberate slow strokes and firm pressure to release chronic tension, tight knots, and muscular stiffness."
    },
    "detailedDescription": {
      "ar": [
        "يستهدف هذا النوع في ألور سبا بالرياض الطبقات العميقة من العضلات والأنسجة الضامة لتحرير نقاط الضغط المؤلمة.",
        "تستخدم خبيراتنا تقنيات متقنة بالساعدين والمرفقين والأنامل لتحقيق نتائج علاجية تدوم طويلاً."
      ],
      "en": [
        "Specifically addresses deep muscular layers and fascia at ALOR SPA Riyadh to dissolve painful trigger points.",
        "Expert therapists utilize purposeful forearm and finger pressure techniques to deliver long-lasting relief."
      ]
    },
    "image": "/images/services/therapeutic-massage.jpg",
    "imageAlt": {
      "ar": "جلسة مساج الأنسجة العميقة لعلاج التيبس العضلي في ألور سبا بالرياض",
      "en": "Deep tissue massage therapy session for women at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": true,
    "price": {
      "amount": 159,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "159 ر.س",
        "en": "159 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "ضغط عميق موجه ومدروس",
        "تركيز على نقاط التيبس المزمن",
        "تقنيات علاجية معتمدة"
      ],
      "en": [
        "Deliberate deep pressure",
        "Focus on chronic myofascial knots",
        "Certified clinical bodywork"
      ]
    },
    "benefits": {
      "ar": [
        "تفكيك العقد العضلية المؤلمة",
        "زيادة مرونة وحرية حركة المفاصل",
        "تخفيف آلام الجلوس الطويل والعمل"
      ],
      "en": [
        "Releases stubborn myofascial adhesions",
        "Restores joint flexibility",
        "Eases postural desk strain"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "التسخين الأولي",
          "description": "تمسيد لطيف لتسخين العضلات السطحية."
        },
        {
          "step": "02",
          "title": "الضغط العميق الموجه",
          "description": "تطبيق ضغط بطيء وعميق على نقاط التوتر المزمنة."
        },
        {
          "step": "03",
          "title": "الإطالة والتهدئة",
          "description": "حركات إطالة خفيفة للمساعدة على استرخاء الألياف العضلية."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Surface Warming",
          "description": "Gradual warming of superficial muscles."
        },
        {
          "step": "02",
          "title": "Deep Trigger Work",
          "description": "Sustained firm pressure on tight fibrous adhesions."
        },
        {
          "step": "03",
          "title": "Gentle Lengthening",
          "description": "Assisted stretching to consolidate muscular release."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة مساج الأنسجة العميقة",
        "زيوت طبيعية علاجية",
        "استشارة فنية متخصصة"
      ],
      "en": [
        "Deep tissue therapeutic session",
        "Natural restorative oils",
        "Personalized therapist consultation"
      ]
    },
    "suitability": {
      "ar": "مثالي للسيدات في الرياض اللاتي يعانين من تيبس مزمن بسبب العمل المكتبي أو التمارين الرياضية أو التوتر المستمر.",
      "en": "Recommended for women in Riyadh with persistent neck and shoulder tightness, athletic fatigue, or desk stress."
    },
    "advisory": {
      "ar": "قد تشعرين ببعض الحساسية في العضلات لمدة 24 ساعة بعد الجلسة، وهو أمر طبيعي يعقبه ارتياح تام.",
      "en": "Mild muscle tenderness for 24 hours post-treatment is normal as tissues recalibrate."
    },
    "seo": {
      "title": {
        "ar": "مساج الأنسجة العميقة بالرياض | علاج التيبس العضلي — ألور سبا",
        "en": "Deep Tissue Massage in Riyadh | Muscle Relief — ALOR SPA"
      },
      "description": {
        "ar": "مساج الأنسجة العميقة بالرياض في ألور سبا. تقنية تدليك مركّزة بالضغط البطيء لتحرير العقد العضلية وتخفيف التيبس المزمن في الظهر والرقبة والكتفين للسيدات.",
        "en": "Targeted deep tissue massage in Riyadh at ALOR SPA. Firm pressure therapy designed for women to release chronic muscle knots, neck tension, and back stiffness."
      }
    }
  },
  {
    "id": "cupping-massage",
    "slug": "cupping-massage",
    "title": {
      "ar": "مساج كاسات الهواء",
      "en": "Cupping Therapy Massage"
    },
    "subtitle": {
      "ar": "دمج تقنيات التدليك الانسيابي مع كاسات الهواء لتحفيز الدورة الدموية",
      "en": "Harmonious gliding massage enhanced with suction cups for circulation stimulation"
    },
    "description": {
      "ar": "مساج كاسات الهواء بالرياض لدى ألور سبا: تقنية علاجية تجمع بين التدليك الانسيابي وكاسات الهواء لتعزيز تدفق الدم وتخفيف الآلام وطرد الشوائب.",
      "en": "A therapeutic cupping massage treatment in Riyadh combining rhythmic gliding strokes with gentle suction cups to stimulate microcirculation and ease muscular soreness."
    },
    "detailedDescription": {
      "ar": [
        "تُستخدم في الجلسة في ألور سبا كاسات طبية معقمة تُطبق بحركات انزلاقية وثابتة لتحفيز التدفق الدموي واللمفاوي.",
        "تساعد على تحرير الالتصاقات بين اللفافة العضلية وتمنح شعوراً عميقاً بالراحة بعد الجلسة."
      ],
      "en": [
        "Employs sterilized therapy cups at ALOR SPA Riyadh applied through sliding and stationary methods to enhance microcirculation.",
        "Helps decompress fascia layers, allowing cellular oxygenation and remarkable physical relaxation."
      ]
    },
    "image": "/images/gallery/gallery-6.jpg",
    "imageAlt": {
      "ar": "جلسة مساج كاسات الهواء وتنشيط الدورة الدموية في ألور سبا بالرياض",
      "en": "Cupping therapy massage treatment for women at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": true,
    "price": {
      "amount": 159,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "159 ر.س",
        "en": "159 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "كاسات معقمة ذات استخدام آمن",
        "تقنية الكاسات المتحركة الانزلاقية",
        "زيوت نباتية مرطبة"
      ],
      "en": [
        "Sterilized hygienic cups",
        "Gliding suction technique",
        "Moisturizing botanical oils"
      ]
    },
    "benefits": {
      "ar": [
        "تنشيط الدورة الدموية الدقيقة",
        "تخفيف آلام عضلات الظهر والرقبة",
        "تحفيز طرد الشوائب والسموم"
      ],
      "en": [
        "Stimulates capillary blood flow",
        "Relieves upper back tension",
        "Supports tissue detoxification"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "تمسيد أولي بالزيوت",
          "description": "تجهيز الظهر بالزيوت لتسهيل حركة الكاسات."
        },
        {
          "step": "02",
          "title": "تطبيق الكاسات الانزلاقية",
          "description": "تحريك الكاسات على طول المسارات العضلية لفك الالتصاقات."
        },
        {
          "step": "03",
          "title": "التهدئة والترطيب",
          "description": "مسح مهدئ للبشرة ومشروب دافئ لتعزيز التروية."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Oil Application",
          "description": "Lubricating skin with warm oils for effortless suction glide."
        },
        {
          "step": "02",
          "title": "Gliding Cupping",
          "description": "Guiding cups across muscular meridians to decompress fascia."
        },
        {
          "step": "03",
          "title": "Soothing Finish",
          "description": "Hydrating post-care and refreshing herbal hospitality."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة مساج كاسات الهواء",
        "كاسات معقمة مخصصة",
        "ضيافة الأعشاب الطبيعية"
      ],
      "en": [
        "Cupping therapy session",
        "Dedicated sterile cups",
        "Herbal wellness drink"
      ]
    },
    "suitability": {
      "ar": "مناسب للسيدات في الرياض اللاتي يعانين من تيبس الظهر المزمن أو الإرهاق العضلي وركود الدورة الدموية.",
      "en": "Suitable for women in Riyadh experiencing stagnant circulation, back fatigue, and physical tightness."
    },
    "advisory": {
      "ar": "قد تظهر علامات دائرية حمراء خفيفة ومؤقتة تتلاشى طبيعياً خلال أيام قليلة.",
      "en": "Temporary circular redness may appear and naturally fades within a few days."
    },
    "seo": {
      "title": {
        "ar": "مساج كاسات الهواء بالرياض | تدليك انسيابي وعلاجي — ألور سبا",
        "en": "Cupping Therapy Massage in Riyadh | Women's Wellness — ALOR SPA"
      },
      "description": {
        "ar": "مساج كاسات الهواء بالرياض لدى ألور سبا. دمج متقن بين التدليك الانسيابي وكاسات الهواء لتنشيط الدورة الدموية الدقيقة وتخفيف آلام وتيبس عضلات الظهر.",
        "en": "Restorative cupping therapy massage in Riyadh at ALOR SPA. Harmonizing gliding bodywork and suction cups to stimulate circulation and relieve muscle soreness."
      }
    }
  },
  {
    "id": "therapeutic-massage",
    "slug": "therapeutic-massage",
    "title": {
      "ar": "مساج علاجي",
      "en": "Therapeutic Massage"
    },
    "subtitle": {
      "ar": "جلسة تدليك تخصصية موجهة لمناطق الألم والإجهاد العضلي",
      "en": "Tailored clinical bodywork addressing focal muscular strain and discomfort"
    },
    "description": {
      "ar": "أفضل مساج علاجي نسائي بالرياض لدى ألور سبا: جلسة تدليك مخصصة تركز على مناطق الإجهاد والألم العضلي لاستعادة المرونة وتخفيف الإرهاق.",
      "en": "A specialized therapeutic massage in Riyadh focusing on areas of accumulated strain and discomfort, utilizing purposeful techniques to restore muscular mobility and relieve fatigue."
    },
    "detailedDescription": {
      "ar": [
        "يقوم هذا العلاج في ألور سبا بالرياض على الفحص الدقيق لمناطق التيبس والضغط في الرقبة والكتفين وأسفل الظهر.",
        "تطبق الأخصائية مزيجاً من الضغط المركز والحركات الإيقاعية لمساعدة الجسم على التعافي الطبيعي."
      ],
      "en": [
        "Starts with an assessment at ALOR SPA Riyadh of tension points in the neck, shoulders, and lower back.",
        "Combines focused pressure and rhythmic strokes to stimulate muscle recovery and ease soreness."
      ]
    },
    "image": "/images/services/therapeutic-massage.jpg",
    "imageAlt": {
      "ar": "جلسة مساج علاجي تخصصي لتخفيف آلام العضلات في ألور سبا بالرياض",
      "en": "Therapeutic clinical massage session for women at ALOR SPA Riyadh"
    },
    "category": "massage",
    "isSignature": false,
    "price": {
      "amount": 159,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "159 ر.س",
        "en": "159 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "خطة علاجية مخصصة حسب احتياجكِ",
        "تركيز على نقاط الألم المحددة",
        "أخصائيات ذوات كفاءة عالية"
      ],
      "en": [
        "Customized treatment approach",
        "Focus on specific pain points",
        "Highly qualified certified therapists"
      ]
    },
    "benefits": {
      "ar": [
        "تخفيف آلام الظهر والرقبة والكتفين",
        "تحسين المرونة ونطاق الحركة",
        "استعادة النشاط والحيوية للجسم"
      ],
      "en": [
        "Relieves back, neck, and shoulder ache",
        "Restores joint range of motion",
        "Reinvigorates tired muscular systems"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "التقييم العضلي",
          "description": "تحديد نقاط الألم والتيبس الرئيسية."
        },
        {
          "step": "02",
          "title": "التدليك العلاجي المركز",
          "description": "تطبيق تقنيات فك العضلات والضغط الموجه."
        },
        {
          "step": "03",
          "title": "التهدئة والإطالة",
          "description": "حركات تمدد واستراحة مريحة مع ضيافة مهدئة."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Targeted Assessment",
          "description": "Identifying key trigger spots and postural strain."
        },
        {
          "step": "02",
          "title": "Focal Therapy",
          "description": "Applying clinical kneading and targeted decompression."
        },
        {
          "step": "03",
          "title": "Assisted Mobility",
          "description": "Gentle passive stretching and calming herbal tea."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة مساج علاجي تخصصي",
        "زيوت علاجية طبيعية",
        "ضيافة ألور سبا المهدئة"
      ],
      "en": [
        "Clinical therapeutic massage session",
        "Therapeutic botanical oils",
        "Calming tea service"
      ]
    },
    "suitability": {
      "ar": "مناسب للسيدات في الرياض اللاتي يعانين من آلام مزمنة في الرقبة والكتفين أو الظهر ناتجة عن التعب والعمل اليومي.",
      "en": "Ideal for women in Riyadh suffering from chronic neck, shoulder, or back strain from daily work stress."
    },
    "advisory": {
      "ar": "يُرجى إبلاغ الأخصائية بأي إصابات سابقة أو تشخيصات طبية معينة قبل بدء الجلسة.",
      "en": "Please inform your therapist of any prior injuries or medical diagnoses before treatment."
    },
    "seo": {
      "title": {
        "ar": "مساج علاجي بالرياض | جلسات تدليك تخصصية للسيدات — ألور سبا",
        "en": "Therapeutic Massage in Riyadh | Specialized Bodywork — ALOR SPA"
      },
      "description": {
        "ar": "أفضل مساج علاجي نسائي بالرياض لدى ألور سبا. جلسة تدليك مخصصة تستهدف نقاط الألم والإجهاد العضلي لاستعادة المرونة الحركية وتجديد النشاط والراحة.",
        "en": "Specialized therapeutic massage for women in Riyadh at ALOR SPA. Tailored clinical bodywork targeting muscle strain to restore natural mobility and ease fatigue."
      }
    }
  },
  {
    "id": "pedicure-manicure",
    "slug": "pedicure-manicure",
    "title": {
      "ar": "بدكير ومنكير",
      "en": "Pedicure & Manicure"
    },
    "subtitle": {
      "ar": "عناية فائقة بالأظافر واليدين والقدمين بأعلى معايير التعقيم والجمال",
      "en": "Exquisite nail and skin beautification upholding strict sterilization standards"
    },
    "description": {
      "ar": "خدمة بدكير ومنكير فاخرة في الرياض لدى ألور سبا تشمل العناية الفائقة بأظافر اليدين والقدمين والتقشير والترطيب بأدوات معقمة ذات استخدام فردي.",
      "en": "Complete luxury manicure and pedicure care in Riyadh including gentle exfoliation, deep moisturizing, and precision nail grooming using sterilized single-use tools."
    },
    "detailedDescription": {
      "ar": [
        "تبدأ الجلسة في ألور سبا بالرياض بنقع اليدين والقدمين في أملاح وزيوت طبيعية ملينة للبشرة ومريحة للأعصاب.",
        "تُستخدم أدوات معقمة ذات استخدام فردي لتشذيب الأظافر وإزالة الجلد الزائد وترطيب البشرة بكريمات زبدة الشيا الفاخرة ومساج خفيف للأطراف."
      ],
      "en": [
        "Begins at ALOR SPA Riyadh with a warm soak infused with essential botanical salts to soften cuticles and soothe fatigue.",
        "Features individually sanitized single-use instruments, expert nail shaping, and deep shea butter nourishment with soothing limb massage."
      ]
    },
    "image": "/images/services/pedicure-manicure.jpg",
    "imageAlt": {
      "ar": "جلسة بدكير ومنكير وعناية بالأظافر واليدين والقدمين في ألور سبا الرياض",
      "en": "Luxury pedicure and manicure nail care treatment at ALOR SPA Riyadh"
    },
    "category": "beauty",
    "isSignature": false,
    "price": {
      "amount": 149,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "149 ر.س",
        "en": "149 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "أدوات معقمة واستخدام فردي",
        "تقشير وترطيب بزبدة الشيا",
        "تشكيل وتلميع احترافي للأظافر"
      ],
      "en": [
        "Single-use sterile instruments",
        "Shea butter exfoliation & moisture",
        "Precision nail shaping & buffing"
      ]
    },
    "benefits": {
      "ar": [
        "نعومة ونضارة فورية لليدين والقدمين",
        "مظهر أظافر صحي وأنيق",
        "استرخاء مريح للأطراف"
      ],
      "en": [
        "Instant softness for hands & feet",
        "Healthy elegant nail appearance",
        "Relaxing limb comfort"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "النقع والتليين",
          "description": "نقع في أملاح وزيوت طبيعية ملينة."
        },
        {
          "step": "02",
          "title": "التشذيب والتقشير",
          "description": "تشذيب دقيق وإزالة الجلد الميت وترطيب غني."
        },
        {
          "step": "03",
          "title": "التدليك والتلميع",
          "description": "تدليك خفيف لليدين والقدمين وتلميع الأظافر بأناقة."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Aromatherapy Soak",
          "description": "Mineral salt soak softening skin and cuticles."
        },
        {
          "step": "02",
          "title": "Grooming & Exfoliation",
          "description": "Precision nail shaping and gentle dead skin removal."
        },
        {
          "step": "03",
          "title": "Massage & Buffing",
          "description": "Hydrating hand & foot massage with brilliant natural buff."
        }
      ]
    },
    "includes": {
      "ar": [
        "جلسة بدكير ومنكير كاملة",
        "أدوات فردية معقمة",
        "ترطيب عميق وتلميع"
      ],
      "en": [
        "Full manicure & pedicure session",
        "Sterile single-use tools",
        "Deep hydration & buffing"
      ]
    },
    "suitability": {
      "ar": "مناسب لجميع السيدات في الرياض الراغبات في مظهر أظافر أنيق وأيدٍ وأقدام ناعمة وصحية مع مساج مريح للأقدام.",
      "en": "Perfect for all women in Riyadh seeking refined nail elegance and velvety-soft hands and feet."
    },
    "advisory": {
      "ar": "تلتزم ألور سبا بأعلى بروتوكولات التعقيم والنظافة لضمان سلامتكِ الكاملة.",
      "en": "We maintain hospital-grade sanitation protocols for your utmost safety."
    },
    "seo": {
      "title": {
        "ar": "بدكير ومنكير بالرياض | عناية فاخرة بالأظافر واليدين — ألور سبا",
        "en": "Pedicure & Manicure in Riyadh | Luxury Nail Care — ALOR SPA"
      },
      "description": {
        "ar": "خدمة بدكير ومنكير فاخرة بالرياض في ألور سبا. عناية تامة بالأظافر واليدين والقدمين تشمل التقشير والترطيب بزبدة الشيا بأدوات معقمة ذات استخدام فردي.",
        "en": "Luxury manicure and pedicure treatments in Riyadh at ALOR SPA. Complete hand and foot beautification, organic exfoliation, and nail grooming in pristine hygiene."
      }
    }
  },
  {
    "id": "moroccan-bath",
    "slug": "moroccan-bath",
    "title": {
      "ar": "حمام مغربي",
      "en": "Moroccan Bath"
    },
    "subtitle": {
      "ar": "طقوس أصيلة بالصابون البلدي والبخار الدافئ لنضارة ونعومة فائقة",
      "en": "Authentic royal hammam ritual with black olive soap for radiant soft skin"
    },
    "description": {
      "ar": "أرقى حمام مغربي بالرياض في ألور سبا: طقس ملكي أصيل في غرفة البخار الدافئة مع الصابون البلدي والتقشير بالليفة المغربية لنعومة ونضارة فائقة.",
      "en": "An authentic royal Moroccan bath ritual in Riyadh inside a warm steam hammam with pure black olive soap and Kessa exfoliation to purify and rejuvenate the skin."
    },
    "detailedDescription": {
      "ar": [
        "تجربة تجديد عميقة في جناح الحمام المغربي الخاص بألور سبا بالرياض تبدأ بجلسة بخار دافئ لفتح المسام وتهيئة البشرة.",
        "يُفرد الصابون المغربي الأسود المصنوع من زيت الزيتون الصافي، يليه تقشير متقن بالليفة المغربية لإزالة الخلايا الميتة واستعادة إشراقة الجلد."
      ],
      "en": [
        "A rejuvenating journey in ALOR SPA Riyadh's private hammam suite opening with a soothing steam bath to relax pores and soften the complexion.",
        "Pure black olive soap is delicately applied, followed by thorough Kessa glove exfoliation to reveal luminous, silky skin."
      ]
    },
    "image": "/images/services/moroccan-bath.jpg",
    "imageAlt": {
      "ar": "طقوس حمام مغربي ملكي فاخر للسيدات في ألور سبا بالرياض",
      "en": "Royal Moroccan bath hammam ritual for women at ALOR SPA Riyadh"
    },
    "category": "bath",
    "isSignature": true,
    "price": {
      "amount": 169,
      "currency": "SAR",
      "isConfirmed": true,
      "display": {
        "ar": "169 ر.س",
        "en": "169 SAR"
      },
      "note": {
        "ar": "السعر يشمل ضريبة القيمة المضافة",
        "en": "Price includes VAT"
      }
    },
    "duration": {
      "isConfirmed": false,
      "display": {
        "ar": "تحدد عند الحجز",
        "en": "Confirmed upon booking"
      },
      "note": {
        "ar": "تحدد المدة بالتنسيق مع أخصائياتنا حسب رغبتكِ وتفضيلكِ الشخصي",
        "en": "Duration is tailored to your preference upon booking"
      }
    },
    "features": {
      "ar": [
        "صابون مغربي بلدي بزيت الزيتون",
        "غرفة بخار دافئة مريحة",
        "ليفة كيسة مغربية معقمة"
      ],
      "en": [
        "Natural olive black soap",
        "Warm steam hammam suite",
        "Sterile authentic Kessa glove"
      ]
    },
    "benefits": {
      "ar": [
        "إزالة خلايا الجلد الميتة وتجديد البشرة",
        "تنشيط الدورة الدموية وتنقية المسام",
        "نعومة حريرية ونضارة تدوم طويلاً"
      ],
      "en": [
        "Sloughs off dead skin cells",
        "Stimulates blood circulation",
        "Silky smoothness & radiant glow"
      ]
    },
    "steps": {
      "ar": [
        {
          "step": "01",
          "title": "حمام البخار الدافئ",
          "description": "الجلوس في البخار لفتح المسام وتليين البشرة."
        },
        {
          "step": "02",
          "title": "الصابون المغربي والتقشير",
          "description": "فرد الصابون البلدي يليه تقشير متقن بالليفة المغربية."
        },
        {
          "step": "03",
          "title": "الشطف والترطيب",
          "description": "شطف بالماء المنعش وترطيب فاخر يمنح البشرة نعومة فائقة."
        }
      ],
      "en": [
        {
          "step": "01",
          "title": "Steam Immersion",
          "description": "Relaxing in warm aromatic steam to soften the skin."
        },
        {
          "step": "02",
          "title": "Black Soap & Kessa",
          "description": "Application of black soap followed by thorough exfoliation."
        },
        {
          "step": "03",
          "title": "Rinse & Hydration",
          "description": "Refreshing rinse with a deeply nourishing hydration veil."
        }
      ]
    },
    "includes": {
      "ar": [
        "طقوس الحمام المغربي كاملة",
        "صابون مغربي بلدي وليفة خاصة",
        "ترطيب ختامي فاخر"
      ],
      "en": [
        "Complete hammam ritual",
        "Authentic black soap & Kessa",
        "Luxurious moisturizing veil"
      ]
    },
    "suitability": {
      "ar": "مناسب لجميع السيدات والعرائس في الرياض الباحثات عن تجديد شامل للبشرة ونظافة استثنائية ونعومة ونضارة حريرية تامة.",
      "en": "Perfect for brides and all women in Riyadh desiring complete skin renewal, exceptional cleanliness, and softness."
    },
    "advisory": {
      "ar": "يُفضل عدم استخدام عطور أو كريمات كيميائية مباشرة بعد الجلسة للحفاظ على راحة المسام.",
      "en": "Avoid heavy synthetic lotions immediately post-hammam to let skin breathe naturally."
    },
    "seo": {
      "title": {
        "ar": "حمام مغربي بالرياض | طقوس مغربية أصيلة بالبخار — ألور سبا",
        "en": "Moroccan Bath in Riyadh | Royal Hammam Ritual — ALOR SPA"
      },
      "description": {
        "ar": "أرقى حمام مغربي بالرياض في ألور سبا. طقوس ملكية في غرفة البخار الدافئة مع الصابون البلدي الطبيعي والليفة المغربية لتقشير البشرة ونعومة ونضارة فائقة.",
        "en": "Experience an authentic royal Moroccan bath in Riyadh at ALOR SPA. Warm steam hammam, natural black soap, and Kessa exfoliation for luminous, silky-soft skin."
      }
    }
  }
];

export function getServiceBySlug(slug: string): ServiceItem | undefined {
  return servicesData.find((s) => s.slug === slug);
}

export function getRelatedServices(currentSlug: string, count: number = 3): ServiceItem[] {
  const current = getServiceBySlug(currentSlug);
  if (!current) return servicesData.slice(0, count);
  return servicesData
    .filter((s) => s.slug !== currentSlug)
    .sort((a, b) => (a.category === current.category ? -1 : 1))
    .slice(0, count);
}
