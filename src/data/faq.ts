/**
 * ALOR SPA — Official FAQ & Search Intent Schema Data
 */

export interface FAQItem {
  q: {
    ar: string;
    en: string;
  };
  a: {
    ar: string;
    en: string;
  };
}

export const faqItems: FAQItem[] = [
  {
    q: {
      ar: 'ما الذي يجعل ألور سبا أفضل مركز مساج وسبا نسائي في الرياض؟',
      en: 'What makes ALOR SPA the best women’s spa and massage center in Riyadh?',
    },
    a: {
      ar: 'يُعد ألور سبا (ALOR SPA) الخيار الأول للباحثات عن أفضل مركز مساج نسائي بالرياض، حيث يوفر خصوصية نسائية مطلقة 100% وأجواءً فاخرة مفعمة بالهدوء. نحرص على تقديم خدمات السبا النسائي المتكاملة على أيدي أخصائيات معتمدات ومحترفات في كافة فنون التدليك والعناية بالبشرة.',
      en: 'ALOR SPA is widely regarded as the premier luxury women spa and massage center in Riyadh, featuring a 100% women-only private sanctuary, tranquil ambiance, and certified expert therapists specializing in holistic relaxation and therapeutic bodywork.',
    },
  },
  {
    q: {
      ar: 'ما هي أنواع المساج والخدمات المتوفرة في مركز ألور سبا الرياض؟',
      en: 'What massage therapies and spa treatments are offered at ALOR SPA Riyadh?',
    },
    a: {
      ar: 'تتضمن قائمتنا باقة متنوعة من أرقى الجلسات: مساج ريلاكس بالرياض للاسترخاء الذهني والبدني، مساج الأحجار الساخنة بالرياض بخصائصها الحرارية البركانية، مساج الأنسجة العميقة بالرياض لعلاج التشنجات المزمنة، مساج كاسات الهواء بالرياض لتنشيط الدورة الدموية، مساج علاجي بالرياض لآلام الظهر والرقبة، مساج الأقدام بالرياض، مساج نحت الجسم بالرياض وتصريف السوائل اللمفاوي، إضافة إلى الحمام المغربي الملكي بالبخار والصابون البلدي، وجلسات بدكير ومنكير فاخرة بأدوات معقمة فردية.',
      en: 'Our treatments include: Relaxing Massage in Riyadh for deep mental renewal, Volcanic Hot Stone Massage in Riyadh, Deep Tissue Massage in Riyadh, Cupping Therapy Massage in Riyadh, Clinical Therapeutic Massage in Riyadh, Foot Reflexology Massage in Riyadh, Lymphatic Drainage & Body Sculpting Massage in Riyadh, authentic Royal Moroccan Bath in steam hammam, and luxury single-use Pedicure & Manicure.',
    },
  },
  {
    q: {
      ar: 'هل يقدم مركز ألور سبا خدمة مساج منزلي بالرياض؟',
      en: 'Does ALOR SPA provide home massage services in Riyadh?',
    },
    a: {
      ar: 'نركز في ألور سبا أساساً على استقبال ضيفاتنا داخل ملاذنا الفاخر بالرياض لنضمن لكِ تجربة استرخاء متكاملة في بيئة مهيأة بأحدث التجهيزات وأعلى معايير التعقيم والسكينة. وبالنسبة لاستفسارات توفر خدمة مساج منزلي نسائي بالرياض أو الحجوزات الخاصة، يُرجى التواصل مباشرة مع فريق الاستقبال عبر الواتساب لتزويدكِ بالتفاصيل والإمكانية المتاحة.',
      en: 'ALOR SPA primarily welcomes clients inside our luxury private sanctuary in Riyadh to guarantee five-star ambiance and medical-grade sanitization. For special inquiries regarding women home massage services in Riyadh or private VIP arrangements, please contact our reception directly via WhatsApp.',
    },
  },
  {
    q: {
      ar: 'كيف يمكنني حجز موعد وما هي مواعيد العمل الرسمية؟',
      en: 'How do I book an appointment and what are the opening hours?',
    },
    a: {
      ar: 'يمكنكِ حجز جلستكِ بسهولة وسرعة عبر التواصل مباشرة عبر الواتساب على الرقم 0553543192 (966553543192+). نستقبل ضيفاتنا الكرام يومياً طوال أيام الأسبوع من الساعة 11:00 صباحاً وحتى الساعة 11:00 مساءً.',
      en: 'Reservations can be made instantly via official WhatsApp at +966553543192. We welcome our guests daily from 11:00 AM to 11:00 PM.',
    },
  },
];

export function getFaqSchema(lang: 'ar' | 'en' = 'ar') {
  return {
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q[lang],
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a[lang],
      },
    })),
  };
}
