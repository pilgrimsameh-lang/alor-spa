import { getDb } from '../src/server/db/index';
import {
  services,
  mediaFiles,
  massageTypes,
  serviceVariants,
  offers,
  packages,
  packageOptions,
} from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * ALOR SPA — Official Authoritative Content Integration Script
 *
 * Enforces:
 * 1. Safe, idempotent updates/inserts (no duplicates).
 * 2. Exact prices provided by spa owner in Saudi Halalas.
 * 3. 9 core services (6 updated, 3 inserted).
 * 4. 6 massage menu types with 18 duration options.
 * 5. 3 promotional offers.
 * 6. 3 standard packages.
 * 7. 4 special packages (with 3 separate options for Friends package).
 * 8. Media associations without deleting or overwriting any disk files.
 */
export async function seedAuthoritativeContent(customDbPath?: string) {
  const { db, client } = getDb(customDbPath);
  const now = Date.now();

  console.log('[ALOR SPA Content Integration] Starting authoritative sync...');

  // Ensure WAL and Foreign Keys
  await client.execute('PRAGMA foreign_keys = ON;');
  await client.execute('PRAGMA journal_mode = WAL;');

  // ==========================================================================
  // 1. ENSURE MEDIA FILES FOR NEW SERVICES IF NOT PRESENT
  // ==========================================================================
  const extraMedia = [
    {
      id: 'med_srv_integrated_4tech',
      filename: 'relaxation-massage.jpg',
      original_name: 'integrated-4tech.jpg',
      mime_type: 'image/jpeg',
      file_size: 57678,
      storage_path: 'images/services/relaxation-massage.jpg',
      public_url: '/images/services/relaxation-massage.jpg',
      alt_ar: 'جلسة مساج متكامل بأربع تقنيات في ألور سبا الرياض',
      alt_en: 'Integrated 4-technique massage session at ALOR SPA Riyadh',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_deep_tissue',
      filename: 'therapeutic-massage.jpg',
      original_name: 'deep-tissue.jpg',
      mime_type: 'image/jpeg',
      file_size: 77732,
      storage_path: 'images/services/therapeutic-massage.jpg',
      public_url: '/images/services/therapeutic-massage.jpg',
      alt_ar: 'جلسة مساج الأنسجة العميقة في ألور سبا الرياض',
      alt_en: 'Deep tissue massage session at ALOR SPA Riyadh',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'med_srv_cupping',
      filename: 'gallery-6.jpg',
      original_name: 'cupping-massage.jpg',
      mime_type: 'image/jpeg',
      file_size: 40740,
      storage_path: 'images/gallery/gallery-6.jpg',
      public_url: '/images/gallery/gallery-6.jpg',
      alt_ar: 'جلسة مساج كاسات الهواء في ألور سبا الرياض',
      alt_en: 'Cupping massage treatment at ALOR SPA Riyadh',
      created_at: now,
      updated_at: now,
    },
  ];

  for (const m of extraMedia) {
    const existing = await client.execute({
      sql: 'SELECT id FROM media_files WHERE id = ?;',
      args: [m.id],
    });
    if (existing.rows.length === 0) {
      await db.insert(mediaFiles).values(m);
    }
  }

  // ==========================================================================
  // 2. CORE SERVICES (9 SERVICES)
  // ==========================================================================
  const officialServices = [
    {
      id: 'relaxation-massage',
      slug: 'relaxation-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_relaxation_massage',
      title_ar: 'مساج ريلاكس',
      title_en: 'Relax Massage',
      subtitle_ar: 'هدوء وانسيابية عميقة لتجديد الطاقة والسكينة',
      subtitle_en: 'Deep tranquil flow for serene mind-body rejuvenation',
      description_ar:
        'مساج استرخائي هادئ بزيوت عطرية طبيعية يساعد على التخلص من الإجهاد اليومي وتحسين الدورة الدموية واستعادة الراحة الذهنية والجسدية.',
      description_en:
        'A soothing relaxation massage using natural essential oils designed to relieve daily stress, improve circulation, and restore mental and physical harmony.',
      detailed_description_ar: [
        'تجربة استرخاء فاخرة تعتمد على ضربات انسيابية لطيفة وضغط هادئ يزيل التوتر العضلي برقة.',
        'تُستخدم في الجلسة زيوت طبيعية نقية ذات روائح عطرية آسرة تمنحكِ شعوراً بالراحة والانتعاش طوال اليوم.',
      ],
      detailed_description_en: [
        'A luxurious relaxation ritual employing gentle rhythmic strokes and soothing pressure to melt away muscular stress.',
        'Enriched with botanical essential oils delivering an exquisite aromatic journey that restores natural vitality.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 1,
      price_amount_halalas: 14900, // 149 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '149 ر.س',
      price_display_en: '149 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null, // No duration invented
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['زيوت عطرية طبيعية مهدئة', 'بيئة هادئة وخصوصية تامة', 'أخصائيات تدليك ذوات خبرة'],
      features_en: ['Natural calming essential oils', 'Tranquil private ambiance', 'Certified expert therapists'],
      benefits_ar: ['تخفيف التوتر العصبي والإرهاق', 'تحسين تدفق الدورة الدموية', 'تعزيز جودة النوم والاسترخاء'],
      benefits_en: ['Relieves nervous tension & fatigue', 'Enhances blood circulation', 'Promotes deep restful sleep'],
      steps_ar: [
        { step: '01', title: 'الاستقبال والتقييم', description: 'استقبال فاخر وتحديد مستوى الضغط المفضل.' },
        { step: '02', title: 'التدليك الانسيابي', description: 'تطبيق الزيوت العطرية بحركات دائرية انسيابية متناغمة.' },
        { step: '03', title: 'التهدئة والراحة', description: 'استراحة هادئة مع مشروب عشبي دافئ.' },
      ],
      steps_en: [
        { step: '01', title: 'Welcome & Consultation', description: 'Tailoring pressure preferences and essential oils.' },
        { step: '02', title: 'Rhythmic Bodywork', description: 'Gliding rhythmic strokes harmonizing the entire body.' },
        { step: '03', title: 'Post-Treatment Refresh', description: 'Quiet resting period with warm herbal tea.' },
      ],
      includes_ar: ['جلسة مساج ريلاكس كاملة', 'زيوت عطرية فاخرة', 'ضيافة المشروبات العشبية'],
      includes_en: ['Full relax massage session', 'Premium aromatherapy oils', 'Herbal beverage hospitality'],
      suitability_ar: 'مناسب لجميع السيدات الباحثات عن الراحة والتخلص من ضغوط العمل والحياة اليومية.',
      suitability_en: 'Ideal for women seeking tranquil recovery from daily routine and mental fatigue.',
      advisory_ar: 'يُرجى إبلاغ الأخصائية في حال وجود حمل أو حساسية جلدية معينة قبل بدء الجلسة.',
      advisory_en: 'Please inform your therapist of pregnancy or skin sensitivities before the session.',
      seo_title_ar: 'مساج ريلاكس بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Relax Massage in Riyadh | ALOR SPA',
      seo_description_ar: 'استمتعي بأفضل جلسة مساج ريلاكس في الرياض لدى ألور سبا بزيوت عطرية فاخرة وخصوصية نسائية تامة.',
      seo_description_en: 'Experience premier relaxation massage in Riyadh at ALOR SPA with natural essential oils and ultimate privacy.',
    },
    {
      id: 'integrated-4tech-massage',
      slug: 'integrated-4tech-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_integrated_4tech',
      title_ar: 'مساج متكامل بأربع تقنيات مختلفة (أحجار، أقدام، ريلاكس، سيتايشو)',
      title_en: 'Integrated 4-Technique Massage (Hot Stone, Foot, Relax, Seitai-sho)',
      subtitle_ar: 'توليفة متكاملة من أربع تقنيات تدليك عالمية لإعادة الحيوية الشاملة',
      subtitle_en: 'A masterful harmony of four modalities for total holistic renewal',
      description_ar:
        'تجربة تدليك متكاملة فريدة تجمع ببراعة بين دفء الأحجار الساخنة وتدليك الأقدام المنعش والريلاكس الهادئ وتقنية السيتايشو التوازنية لإعادة الحيوية الشاملة للجسم.',
      description_en:
        'A unique integrated massage experience harmonizing four distinct modalities: soothing hot stones, revitalizing foot reflexology, calming relaxation, and balancing Seitai-sho.',
      detailed_description_ar: [
        'ابتكرت خبيرات ألور سبا هذه الجلسة الجامعة لتقديم أقصى درجات الفائدة والاستجمام في آن واحد.',
        'تدمج الجلسة بين انسيابية الريلاكس، وعمق حرارة أحجار البازلت، وتدليك منعكسات القدمين، وتوازن السيتايشو الشرقي.',
      ],
      detailed_description_en: [
        'Designed by ALOR SPA master therapists to deliver multi-dimensional wellness and peak relaxation.',
        'Blends fluid relaxation strokes, grounding volcanic heat, targeted foot reflexology, and Seitai-sho balancing.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 2,
      price_amount_halalas: 15900, // 159 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '159 ر.س',
      price_display_en: '159 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['أربع تقنيات في جلسة واحدة', 'أحجار بازلت بركانية دافئة', 'تقنية سيتايشو اليابانية'],
      features_en: ['Four techniques in one ritual', 'Warm volcanic basalt stones', 'Japanese Seitai-sho alignment'],
      benefits_ar: ['فك التشنجات العضلية العميقة', 'تنشيط مسارات الطاقة الحيوية', 'شعور متكامل بالخفة والراحة'],
      benefits_en: ['Releases deep muscular contractions', 'Restores vital energy channels', 'Overall lightness & revitalization'],
      steps_ar: [
        { step: '01', title: 'مساج الريلاكس التمهيدي', description: 'تهدئة الجسم وتهيئته بالزيوت الدافئة.' },
        { step: '02', title: 'الأحجار وتدليك الأقدام', description: 'تطبيق أحجار البازلت الساخنة مع مساج القدمين الانعكاسي.' },
        { step: '03', title: 'تقنية السيتايشو التوازنية', description: 'حركات توازنية لتحرير المفاصل ومحاذاة الطاقة.' },
      ],
      steps_en: [
        { step: '01', title: 'Relaxation Foundation', description: 'Soothing the body with warm botanical oils.' },
        { step: '02', title: 'Stones & Foot Reflexology', description: 'Heated basalt stones with stimulating foot pressure.' },
        { step: '03', title: 'Seitai-sho Harmonization', description: 'Gentle structural balancing and tension release.' },
      ],
      includes_ar: ['جلسة المساج المتكامل', 'استخدام أحجار البازلت', 'ضيافة ألور سبا الخاصة'],
      includes_en: ['Full integrated 4-technique session', 'Basalt stones treatment', 'ALOR SPA herbal hospitality'],
      suitability_ar: 'مثالي لمن يعانين من إرهاق جسدي عام ويبحثن عن تجربة استجمام عميقة ومتنوعة.',
      suitability_en: 'Perfect for women experiencing generalized fatigue seeking a multifaceted treatment.',
      advisory_ar: 'يُنصح بعدم ممارسة أنشطة شاقة بعد الجلسة للاستمتاع بالاسترخاء العميق.',
      advisory_en: 'Restful activity is recommended following this intensive treatment.',
      seo_title_ar: 'مساج متكامل بأربع تقنيات بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Integrated 4-Technique Massage Riyadh | ALOR SPA',
      seo_description_ar: 'اكتشفي جلسة المساج المتكامل بأربع تقنيات (أحجار، أقدام، ريلاكس، سيتايشو) في ألور سبا الرياض بـ 159 ريال.',
      seo_description_en: 'Discover our 4-technique integrated massage combining hot stones, foot reflexology, relax, and Seitai-sho in Riyadh.',
    },
    {
      id: 'body-sculpting-drainage',
      slug: 'body-sculpting-drainage',
      category_id: 'cat_wellness',
      featured_image_id: 'med_srv_body_sculpting_drainage',
      title_ar: 'مساج نحت الجسم وتصريف السوائل',
      title_en: 'Body Contouring & Lymphatic Drainage Massage',
      subtitle_ar: 'تقنية تخصصية لتنشيط التصريف اللمفاوي وشد القوام برقة',
      subtitle_en: 'Specialized therapy promoting lymphatic flow and gentle contour firming',
      description_ar:
        'جلسة تدليك متخصصة تستهدف تنشيط التصريف اللمفاوي وتقليل احتباس السوائل والمساعدة على شد القوام ونحت المنحنيات الطبيعية للجسم.',
      description_en:
        'A specialized bodywork therapy focused on stimulating lymphatic circulation, reducing fluid retention, and gently firming and sculpting natural contours.',
      detailed_description_ar: [
        'تعتمد هذه الجلسة على حركات ضغط إيقاعية موجهة نحو العقد اللمفاوية لتحفيز التخلص الطبيعي من السوائل المحتبسة.',
        'تساهم في تحسين ملمس البشرة وتعزيز الشعور بالخفة والحيوية للجسم بأكمله.',
      ],
      detailed_description_en: [
        'Applies precise rhythmic strokes directed along lymphatic pathways to encourage natural fluid drainage.',
        'Enhances skin tone and contour definition while instilling a renewed sense of lightness throughout.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 3,
      price_amount_halalas: 16900, // 169 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '169 ر.س',
      price_display_en: '169 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['حركات تصريف لمفاوي مدروسة', 'تركيز على مناطق احتباس السوائل', 'منتجات طبيعية معززة للمرونة'],
      features_en: ['Clinical lymphatic pumping technique', 'Focus on fluid retention zones', 'Natural elasticity-enhancing lotions'],
      benefits_ar: ['تقليل الانتفاخ واحتباس السوائل', 'تحفيز الدورة اللمفاوية الطبيعية', 'شد ودعم المنحنيات الطبيعية'],
      benefits_en: ['Reduces puffiness & fluid accumulation', 'Stimulates sluggish lymphatic system', 'Firms and refines natural contours'],
      steps_ar: [
        { step: '01', title: 'التقييم وتحديد الاحتياج', description: 'تحديد المناطق المستهدفة لاحتباس السوائل.' },
        { step: '02', title: 'التدليك اللمفاوي الإيقاعي', description: 'تطبيق تقنيات الضخ اللمفاوي باتجاه القنوات الرئيسية.' },
        { step: '03', title: 'الترطيب والشد', description: 'ترطيب البشرة بمركبات طبيعية مهدئة تدعم مرونة الجلد.' },
      ],
      steps_en: [
        { step: '01', title: 'Assessment', description: 'Evaluating key target areas and circulation flow.' },
        { step: '02', title: 'Rhythmic Drainage', description: 'Gentle wave-like pumping encouraging fluid transit.' },
        { step: '03', title: 'Hydration & Toning', description: 'Soothing moisturizing finish optimizing skin elasticity.' },
      ],
      includes_ar: ['جلسة نحت الجسم والتصريف اللمفاوي', 'مرطبات طبيعية مخصصة', 'إرشادات العناية المنزلية'],
      includes_en: ['Targeted body contouring session', 'Specialized botanical lotions', 'Post-treatment wellness tips'],
      suitability_ar: 'مثالي للسيدات اللاتي يعانين من احتباس السوائل أو الشعور بثقل في الأطراف أو يرغبن في تحسين مظهر القوام.',
      suitability_en: 'Recommended for women experiencing water retention, limb heaviness, or seeking toned contours.',
      advisory_ar: 'يُنصح بالإكثار من شرب الماء النقي قبل الجلسة وبعدها لتعزيز كفاءة التصريف الطبيعي.',
      advisory_en: 'Drinking plenty of pure water before and after treatment is strongly advised.',
      seo_title_ar: 'مساج نحت الجسم وتصريف السوائل بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Body Contouring & Lymphatic Drainage Riyadh | ALOR SPA',
      seo_description_ar: 'جلسات مساج نحت الجسم والتصريف اللمفاوي في الرياض لدى ألور سبا لتقليل احتباس السوائل وشد القوام بـ 169 ريال.',
      seo_description_en: 'Professional body sculpting and lymphatic drainage massage at ALOR SPA Riyadh for 169 SAR.',
    },
    {
      id: 'hot-stone-massage',
      slug: 'hot-stone-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_hot_stone_massage',
      title_ar: 'مساج الأحجار الساخنة',
      title_en: 'Hot Stone Massage',
      subtitle_ar: 'دفء أحجار البازلت البركانية لتفكيك تشنج العضلات العميقة',
      subtitle_en: 'Warm volcanic basalt stones melting away chronic muscle tightness',
      description_ar:
        'علاج حراري عميق باستخدام أحجار البازلت البركانية الدافئة والزيوت الطبيعية لفك تشنج العضلات العميقة وبث الدفء والسكينة في كامل الجسم.',
      description_en:
        'A deeply grounding thermal therapy employing heated volcanic basalt stones and natural nourishing oils to melt away deep muscular tension and induce tranquility.',
      detailed_description_ar: [
        'تُسخن أحجار البازلت الطبيعية بدقة إلى درجات حرارة مريحة وتوضع على نقاط الطاقة الرئيسية في الظهر والكتفين.',
        'تتخلل الحرارة المهدئة ألياف العضلات المشدودة، مما يسمح للأخصائية بتدليك مريح يزيل الإجهاد تماماً.',
      ],
      detailed_description_en: [
        'Smooth volcanic stones are warmed to comforting temperatures and placed along key energy centers.',
        'Radiant warmth penetrates deep into taut muscle fibers, releasing stiffness and restoring inner calmness.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 4,
      price_amount_halalas: 15900, // 159 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '159 ر.س',
      price_display_en: '159 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['أحجار بازلت طبيعية ملساء', 'تدفئة حرارية علاجية مدروسة', 'زيوت نباتية دافئة'],
      features_en: ['Polished basalt volcanic stones', 'Controlled therapeutic heat', 'Warm botanical massage oils'],
      benefits_ar: ['فك التشنجات العضلية المستعصية', 'تحسين الدورة الدموية والتغذية الخلوية', 'تهدئة عميقة للجهاز العصبي'],
      benefits_en: ['Relieves stubborn chronic muscle knots', 'Improves vascular microcirculation', 'Deeply calms nervous system'],
      steps_ar: [
        { step: '01', title: 'تطبيق الزيوت الدافئة', description: 'تهيئة الظهر والكتفين بالزيوت العطرية الدافئة.' },
        { step: '02', title: 'تمسيد بالأحجار الساخنة', description: 'انزلاق الأحجار الدافئة بحركات متناسقة على طول العضلات.' },
        { step: '03', title: 'وضع الأحجار على نقاط التوازن', description: 'تثبيت الأحجار لبث الدفء المستمر والاسترخاء.' },
      ],
      steps_en: [
        { step: '01', title: 'Warm Oil Application', description: 'Prepping back and shoulders with botanical essences.' },
        { step: '02', title: 'Stone Gliding Strokes', description: 'Smooth warm stones guided over taut muscle groups.' },
        { step: '03', title: 'Stationary Placement', description: 'Resting stones on chakra meridian points for thermal immersion.' },
      ],
      includes_ar: ['جلسة مساج الأحجار الساخنة', 'أحجار البازلت المعقمة', 'ضيافة الأعشاب المهدئة'],
      includes_en: ['Full hot stone therapy session', 'Sterilized basalt stones', 'Calming herbal tea service'],
      suitability_ar: 'ممتاز لمن يعانين من تيبس عضلات الظهر وبرودة الأطراف والإجهاد البدني المتراكم.',
      suitability_en: 'Ideal for those suffering from chronic back stiffness, cold extremities, and muscular exhaustion.',
      advisory_ar: 'غير مناسب في حالات الحمى أو الالتهابات الجلدية الحادة أو الحمل.',
      advisory_en: 'Not recommended during fever, acute skin inflammation, or pregnancy without medical clearance.',
      seo_title_ar: 'مساج الأحجار الساخنة بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Hot Stone Massage in Riyadh | ALOR SPA',
      seo_description_ar: 'جلسات مساج الأحجار الساخنة بالرياض لدى ألور سبا بأحجار البازلت الطبيعية لفك التشنج العضلي بـ 159 ريال.',
      seo_description_en: 'Warm basalt hot stone massage session in Riyadh at ALOR SPA for 159 SAR.',
    },
    {
      id: 'deep-tissue-massage',
      slug: 'deep-tissue-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_deep_tissue',
      title_ar: 'مساج الأنسجة العميقة',
      title_en: 'Deep Tissue Massage',
      subtitle_ar: 'تدليك مركز بالضغط البطيء لتحرير العقد العضلية والتيبس المزمن',
      subtitle_en: 'Firm targeted pressure releasing persistent muscle knots and chronic stiffness',
      description_ar:
        'تدليك مكثف وموجه بالضغط البطيء والعميق لتحرير العقد العضلية وتخفيف التيبس المزمن في الظهر والرقبة والكتفين.',
      description_en:
        'An intensive, targeted therapy applying deliberate slow strokes and firm pressure to release chronic tension, tight knots, and muscular stiffness.',
      detailed_description_ar: [
        'يستهدف هذا النوع الطبقات العميقة من العضلات والأنسجة الضامة لتحرير نقاط الضغط المؤلمة.',
        'تستخدم خبيراتنا تقنيات متقنة بالساعدين والمرفقين والأنامل لتحقيق نتائج تدوم طويلاً.',
      ],
      detailed_description_en: [
        'Specifically addresses deep muscular layers and fascia to dissolve painful trigger points.',
        'Expert therapists utilize purposeful forearm and finger pressure techniques to deliver long-lasting relief.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 5,
      price_amount_halalas: 15900, // 159 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '159 ر.س',
      price_display_en: '159 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['ضغط عميق موجه ومدروس', 'تركيز على نقاط التيبس المزمن', 'تقنيات علاجية معتمدة'],
      features_en: ['Deliberate deep pressure', 'Focus on chronic myofascial knots', 'Certified clinical bodywork'],
      benefits_ar: ['تفكيك العقد العضلية المؤلمة', 'زيادة مرونة وحرية حركة المفاصل', 'تخفيف آلام الجلوس الطويل والعمل'],
      benefits_en: ['Releases stubborn myofascial adhesions', 'Restores joint flexibility', 'Eases postural desk strain'],
      steps_ar: [
        { step: '01', title: 'التسخين الأولي', description: 'تمسيد لطيف لتسخين العضلات السطحية.' },
        { step: '02', title: 'الضغط العميق الموجه', description: 'تطبيق ضغط بطيء وعميق على نقاط التوتر المزمنة.' },
        { step: '03', title: 'الإطالة والتهدئة', description: 'حركات إطالة خفيفة للمساعدة على استرخاء الألياف العضلية.' },
      ],
      steps_en: [
        { step: '01', title: 'Surface Warming', description: 'Gradual warming of superficial muscles.' },
        { step: '02', title: 'Deep Trigger Work', description: 'Sustained firm pressure on tight fibrous adhesions.' },
        { step: '03', title: 'Gentle Lengthening', description: 'Assisted stretching to consolidate muscular release.' },
      ],
      includes_ar: ['جلسة مساج الأنسجة العميقة', 'زيوت طبيعية علاجية', 'استشارة فنية متخصصة'],
      includes_en: ['Deep tissue therapeutic session', 'Natural restorative oils', 'Personalized therapist consultation'],
      suitability_ar: 'مثالي لمن يعانين من تيبس مزمن بسبب العمل المكتبي أو التمارين الرياضية أو التوتر المستمر.',
      suitability_en: 'Recommended for those with persistent neck and shoulder tightness, athletic fatigue, or desk stress.',
      advisory_ar: 'قد تشعرين ببعض الحساسية في العضلات لمدة 24 ساعة بعد الجلسة، وهو أمر طبيعي يعقبه ارتياح تام.',
      advisory_en: 'Mild muscle tenderness for 24 hours post-treatment is normal as tissues recalibrate.',
      seo_title_ar: 'مساج الأنسجة العميقة بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Deep Tissue Massage in Riyadh | ALOR SPA',
      seo_description_ar: 'جلسة مساج الأنسجة العميقة في الرياض لدى ألور سبا لفك العقد العضلية والتيبس بـ 159 ريال.',
      seo_description_en: 'Targeted deep tissue massage in Riyadh at ALOR SPA for 159 SAR.',
    },
    {
      id: 'cupping-massage',
      slug: 'cupping-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_cupping',
      title_ar: 'مساج كاسات الهواء',
      title_en: 'Cupping Therapy Massage',
      subtitle_ar: 'دمج تقنيات التدليك الانسيابي مع كاسات الهواء لتحفيز الدورة الدموية',
      subtitle_en: 'Harmonious gliding massage enhanced with suction cups for circulation stimulation',
      description_ar:
        'تقنية علاجية تجمع بين التدليك الانسيابي وكاسات الهواء لتعزيز تدفق الدم وتخفيف الآلام العضلية والمساعدة على طرد السموم والشوائب.',
      description_en:
        'A therapeutic treatment combining rhythmic gliding strokes with gentle suction cups to stimulate microcirculation, ease muscular soreness, and promote recovery.',
      detailed_description_ar: [
        'تُستخدم في الجلسة كاسات طبية معقمة تُطبق بحركات انزلاقية وثابتة لتحفيز التدفق الدموي واللمفاوي.',
        'تساعد على تحرير الالتصاقات بين اللفافة العضلية وتمنح شعوراً عميقاً بالراحة بعد الجلسة.',
      ],
      detailed_description_en: [
        'Employs sterilized therapy cups applied through sliding and stationary methods to enhance microcirculation.',
        'Helps decompress fascia layers, allowing cellular oxygenation and remarkable physical relaxation.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 6,
      price_amount_halalas: 15900, // 159 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '159 ر.س',
      price_display_en: '159 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['كاسات معقمة ذات استخدام آمن', 'تقنية الكاسات المتحركة الانزلاقية', 'زيوت نباتية مرطبة'],
      features_en: ['Sterilized hygienic cups', 'Gliding suction technique', 'Moisturizing botanical oils'],
      benefits_ar: ['تنشيط الدورة الدموية الدقيقة', 'تخفيف آلام عضلات الظهر والرقبة', 'تحفيز طرد الشوائب والسموم'],
      benefits_en: ['Stimulates capillary blood flow', 'Relieves upper back tension', 'Supports tissue detoxification'],
      steps_ar: [
        { step: '01', title: 'تمسيد أولي بالزيوت', description: 'تجهيز الظهر بالزيوت لتسهيل حركة الكاسات.' },
        { step: '02', title: 'تطبيق الكاسات الانزلاقية', description: 'تحريك الكاسات على طول المسارات العضلية لفك الالتصاقات.' },
        { step: '03', title: 'التهدئة والترطيب', description: 'مسح مهدئ للبشرة ومشروب دافئ لتعزيز التروية.' },
      ],
      steps_en: [
        { step: '01', title: 'Oil Application', description: 'Lubricating skin with warm oils for effortless suction glide.' },
        { step: '02', title: 'Gliding Cupping', description: 'Guiding cups across muscular meridians to decompress fascia.' },
        { step: '03', title: 'Soothing Finish', description: 'Hydrating post-care and refreshing herbal hospitality.' },
      ],
      includes_ar: ['جلسة مساج كاسات الهواء', 'كاسات معقمة مخصصة', 'ضيافة الأعشاب الطبيعية'],
      includes_en: ['Cupping therapy session', 'Dedicated sterile cups', 'Herbal wellness drink'],
      suitability_ar: 'مناسب لمن يعانين من تيبس الظهر المزمن أو الإرهاق العضلي وركود الدورة الدموية.',
      suitability_en: 'Suitable for those experiencing stagnant circulation, back fatigue, and physical tightness.',
      advisory_ar: 'قد تظهر علامات دائرية حمراء خفيفة ومؤقتة تتلاشى طبيعياً خلال أيام قليلة.',
      advisory_en: 'Temporary circular redness may appear and naturally fades within a few days.',
      seo_title_ar: 'مساج كاسات الهواء بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Cupping Therapy Massage Riyadh | ALOR SPA',
      seo_description_ar: 'جلسة مساج كاسات الهواء بالرياض لدى ألور سبا لتنشيط الدورة الدموية وتخفيف آلام الظهر بـ 159 ريال.',
      seo_description_en: 'Professional cupping therapy massage at ALOR SPA Riyadh for 159 SAR.',
    },
    {
      id: 'therapeutic-massage',
      slug: 'therapeutic-massage',
      category_id: 'cat_massage',
      featured_image_id: 'med_srv_therapeutic_massage',
      title_ar: 'مساج علاجي',
      title_en: 'Therapeutic Massage',
      subtitle_ar: 'جلسة تدليك تخصصية موجهة لمناطق الألم والإجهاد العضلي',
      subtitle_en: 'Tailored clinical bodywork addressing focal muscular strain and discomfort',
      description_ar:
        'جلسة تدليك مخصصة تركز على مناطق الإجهاد والألم العضلي باستخدام تقنيات علمية مدروسة لاستعادة المرونة الحركية وتخفيف الإرهاق.',
      description_en:
        'A tailored clinical massage focusing on areas of accumulated strain and discomfort, utilizing purposeful techniques to restore muscular mobility and relieve fatigue.',
      detailed_description_ar: [
        'يقوم هذا العلاج على الفحص الدقيق لمناطق التيبس والضغط في الرقبة والكتفين وأسفل الظهر.',
        'تطبق الأخصائية مزيجاً من الضغط المركز والحركات الإيقاعية لمساعدة الجسم على التعافي الطبيعي.',
      ],
      detailed_description_en: [
        'Starts with an assessment of tension points in the neck, shoulders, and lower back.',
        'Combines focused pressure and rhythmic strokes to stimulate muscle recovery and ease soreness.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 7,
      price_amount_halalas: 15900, // 159 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '159 ر.س',
      price_display_en: '159 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['خطة علاجية مخصصة حسب احتياجكِ', 'تركيز على نقاط الألم المحددة', 'أخصائيات ذوات كفاءة عالية'],
      features_en: ['Customized treatment approach', 'Focus on specific pain points', 'Highly qualified certified therapists'],
      benefits_ar: ['تخفيف آلام الظهر والرقبة والكتفين', 'تحسين المرونة ونطاق الحركة', 'استعادة النشاط والحيوية للجسم'],
      benefits_en: ['Relieves back, neck, and shoulder ache', 'Restores joint range of motion', 'Reinvigorates tired muscular systems'],
      steps_ar: [
        { step: '01', title: 'التقييم العضلي', description: 'تحديد نقاط الألم والتيبس الرئيسية.' },
        { step: '02', title: 'التدليك العلاجي المركز', description: 'تطبيق تقنيات فك العضلات والضغط الموجه.' },
        { step: '03', title: 'التهدئة والإطالة', description: 'حركات تمدد واستراحة مريحة مع ضيافة مهدئة.' },
      ],
      steps_en: [
        { step: '01', title: 'Targeted Assessment', description: 'Identifying key trigger spots and postural strain.' },
        { step: '02', title: 'Focal Therapy', description: 'Applying clinical kneading and targeted decompression.' },
        { step: '03', title: 'Assisted Mobility', description: 'Gentle passive stretching and calming herbal tea.' },
      ],
      includes_ar: ['جلسة مساج علاجي تخصصي', 'زيوت علاجية طبيعية', 'ضيافة ألور سبا المهدئة'],
      includes_en: ['Clinical therapeutic massage session', 'Therapeutic botanical oils', 'Calming tea service'],
      suitability_ar: 'مناسب لمن يعانين من آلام مزمنة في الرقبة والكتفين أو الظهر ناتجة عن التعب والعمل اليومي.',
      suitability_en: 'Ideal for women suffering from chronic neck, shoulder, or back strain from daily work stress.',
      advisory_ar: 'يُرجى إبلاغ الأخصائية بأي إصابات سابقة أو تشخيصات طبية معينة قبل بدء الجلسة.',
      advisory_en: 'Please inform your therapist of any prior injuries or medical diagnoses before treatment.',
      seo_title_ar: 'مساج علاجي بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Therapeutic Massage in Riyadh | ALOR SPA',
      seo_description_ar: 'جلسة مساج علاجي متخصصة في الرياض لدى ألور سبا لتخفيف آلام الظهر والرقبة بـ 159 ريال.',
      seo_description_en: 'Targeted therapeutic massage session in Riyadh at ALOR SPA for 159 SAR.',
    },
    {
      id: 'pedicure-manicure',
      slug: 'pedicure-manicure',
      category_id: 'cat_beauty',
      featured_image_id: 'med_srv_pedicure_manicure',
      title_ar: 'بدكير ومنكير',
      title_en: 'Pedicure & Manicure',
      subtitle_ar: 'عناية فائقة بالأظافر واليدين والقدمين بأعلى معايير التعقيم والجمال',
      subtitle_en: 'Exquisite nail and skin beautification upholding strict sterilization standards',
      description_ar:
        'عناية فائقة وفاخرة بأظافر اليدين والقدمين تشمل التقشير والترطيب اللطيف والتشكيل الدقيق بأدوات معقمة ذات استخدام فردي لضمان أقصى درجات النظافة والجمال.',
      description_en:
        'Complete hand and foot beauty care including gentle exfoliation, deep moisturizing, and precision nail grooming using sterilized single-use tools.',
      detailed_description_ar: [
        'تبدأ الجلسة بنقع اليدين والقدمين في أملاح وزيوت طبيعية ملينة للبشرة ومريحة للأعصاب.',
        'تُستخدم أدوات معقمة ذات استخدام فردي لتشذيب الأظافر وإزالة الجلد الزائد وترطيب البشرة بكريمات زبدة الشيا الفاخرة.',
      ],
      detailed_description_en: [
        'Begins with a warm soak infused with essential botanical salts to soften cuticles and soothe fatigue.',
        'Features individually sanitized single-use instruments, expert nail shaping, and deep shea butter nourishment.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 8,
      price_amount_halalas: 14900, // 149 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '149 ر.س',
      price_display_en: '149 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['أدوات معقمة واستخدام فردي', 'تقشير وترطيب بزبدة الشيا', 'تشكيل وتلميع احترافي للأظافر'],
      features_en: ['Single-use sterile instruments', 'Shea butter exfoliation & moisture', 'Precision nail shaping & buffing'],
      benefits_ar: ['نعومة ونضارة فورية لليدين والقدمين', 'مظهر أظافر صحي وأنيق', 'استرخاء مريح للأطراف'],
      benefits_en: ['Instant softness for hands & feet', 'Healthy elegant nail appearance', 'Relaxing limb comfort'],
      steps_ar: [
        { step: '01', title: 'النقع والتليين', description: 'نقع في أملاح وزيوت طبيعية ملينة.' },
        { step: '02', title: 'التشذيب والتقشير', description: 'تشذيب دقيق وإزالة الجلد الميت وترطيب غني.' },
        { step: '03', title: 'التدليك والتلميع', description: 'تدليك خفيف لليدين والقدمين وتلميع الأظافر بأناقة.' },
      ],
      steps_en: [
        { step: '01', title: 'Aromatherapy Soak', description: 'Mineral salt soak softening skin and cuticles.' },
        { step: '02', title: 'Grooming & Exfoliation', description: 'Precision nail shaping and gentle dead skin removal.' },
        { step: '03', title: 'Massage & Buffing', description: 'Hydrating hand & foot massage with brilliant natural buff.' },
      ],
      includes_ar: ['جلسة بدكير ومنكير كاملة', 'أدوات فردية معقمة', 'ترطيب عميق وتلميع'],
      includes_en: ['Full manicure & pedicure session', 'Sterile single-use tools', 'Deep hydration & buffing'],
      suitability_ar: 'مناسب لجميع السيدات الراغبات في مظهر أظافر أنيق وأيدٍ وأقدام ناعمة وصحية.',
      suitability_en: 'Perfect for all women seeking refined nail elegance and velvety-soft hands and feet.',
      advisory_ar: 'تلتزم ألور سبا بأعلى بروتوكولات التعقيم والنظافة لضمان سلامتكِ الكاملة.',
      advisory_en: 'We maintain hospital-grade sanitation protocols for your utmost safety.',
      seo_title_ar: 'بدكير ومنكير بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Pedicure & Manicure in Riyadh | ALOR SPA',
      seo_description_ar: 'جلسة بدكير ومنكير فاخرة في الرياض لدى ألور سبا بأدوات معقمة وترطيب عميق بـ 149 ريال.',
      seo_description_en: 'Luxury pedicure and manicure care in Riyadh at ALOR SPA for 149 SAR.',
    },
    {
      id: 'moroccan-bath',
      slug: 'moroccan-bath',
      category_id: 'cat_bath',
      featured_image_id: 'med_srv_moroccan_bath',
      title_ar: 'حمام مغربي',
      title_en: 'Moroccan Bath',
      subtitle_ar: 'طقوس أصيلة بالصابون البلدي والبخار الدافئ لنضارة ونعومة فائقة',
      subtitle_en: 'Authentic royal hammam ritual with black olive soap for radiant soft skin',
      description_ar:
        'طقس تقليدي أصيل في غرفة البخار الدافئة مع الصابون البلدي الطبيعي والتقشير بالليفة المغربية لتنقية البشرة وتجديد خلاياها ومنحها نعومة ونضارة فائقة.',
      description_en:
        'An authentic traditional ritual in a warm steam room with pure black olive soap and gentle Kessa exfoliation to purify, detoxify, and rejuvenate the skin.',
      detailed_description_ar: [
        'تجربة استرخاء وتجديد عميق تبدأ بجلسة بخار دافئ لفتح المسام وتهيئة البشرة.',
        'يُفرد الصابون المغربي الأسود المصنوع من زيت الزيتون الصافي، يليه تقشير متقن بالليفة المغربية لإزالة الخلايا الميتة واستعادة إشراقة الجلد.',
      ],
      detailed_description_en: [
        'A rejuvenating journey opening with a soothing steam bath to relax pores and soften the complexion.',
        'Pure black olive soap is delicately applied, followed by thorough Kessa glove exfoliation to reveal luminous, silky skin.',
      ],
      is_signature: 1,
      is_published: 1,
      display_order: 9,
      price_amount_halalas: 16900, // 169 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '169 ر.س',
      price_display_en: '169 SAR',
      price_note_ar: 'السعر يشمل ضريبة القيمة المضافة',
      price_note_en: 'Price includes VAT',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      duration_note_ar: null,
      duration_note_en: null,
      features_ar: ['صابون مغربي بلدي بزيت الزيتون', 'غرفة بخار دافئة مريحة', 'ليفة كيسة مغربية معقمة'],
      features_en: ['Natural olive black soap', 'Warm steam hammam suite', 'Sterile authentic Kessa glove'],
      benefits_ar: ['إزالة خلايا الجلد الميتة وتجديد البشرة', 'تنشيط الدورة الدموية وتنقية المسام', 'نعومة حريرية ونضارة تدوم طويلاً'],
      benefits_en: ['Sloughs off dead skin cells', 'Stimulates blood circulation', 'Silky smoothness & radiant glow'],
      steps_ar: [
        { step: '01', title: 'حمام البخار الدافئ', description: 'الجلوس في البخار لفتح المسام وتليين البشرة.' },
        { step: '02', title: 'الصابون المغربي والتقشير', description: 'فرد الصابون البلدي يليه تقشير متقن بالليفة المغربية.' },
        { step: '03', title: 'الشطف والترطيب', description: 'شطف بالماء المنعش وترطيب فاخر يمنح البشرة نعومة فائقة.' },
      ],
      steps_en: [
        { step: '01', title: 'Steam Immersion', description: 'Relaxing in warm aromatic steam to soften the skin.' },
        { step: '02', title: 'Black Soap & Kessa', description: 'Application of black soap followed by thorough exfoliation.' },
        { step: '03', title: 'Rinse & Hydration', description: 'Refreshing rinse with a deeply nourishing hydration veil.' },
      ],
      includes_ar: ['طقوس الحمام المغربي كاملة', 'صابون مغربي بلدي وليفة خاصة', 'ترطيب ختامي فاخر'],
      includes_en: ['Complete hammam ritual', 'Authentic black soap & Kessa', 'Luxurious moisturizing veil'],
      suitability_ar: 'مناسب لجميع السيدات والعرائس الباحثات عن تجديد شامل للبشرة ونظافة استثنائية ونعومة تامة.',
      suitability_en: 'Perfect for brides and all women desiring complete skin renewal, exceptional cleanliness, and softness.',
      advisory_ar: 'يُفضل عدم استخدام عطور أو كريمات كيميائية مباشرة بعد الجلسة للحفاظ على راحة المسام.',
      advisory_en: 'Avoid heavy synthetic lotions immediately post-hammam to let skin breathe naturally.',
      seo_title_ar: 'حمام مغربي بالرياض | ألور سبا — ALOR SPA',
      seo_title_en: 'Moroccan Bath in Riyadh | ALOR SPA',
      seo_description_ar: 'طقوس الحمام المغربي الأصيل في الرياض لدى ألور سبا بالصابون البلدي والبخار الدافئ بـ 169 ريال.',
      seo_description_en: 'Authentic royal Moroccan bath hammam experience in Riyadh at ALOR SPA for 169 SAR.',
    },
  ];

  for (const s of officialServices) {
    const existing = await client.execute({
      sql: 'SELECT id FROM services WHERE id = ?;',
      args: [s.id],
    });

    if (existing.rows.length > 0) {
      // Update safely
      await db
        .update(services)
        .set({
          title_ar: s.title_ar,
          title_en: s.title_en,
          subtitle_ar: s.subtitle_ar,
          subtitle_en: s.subtitle_en,
          description_ar: s.description_ar,
          description_en: s.description_en,
          detailed_description_ar: s.detailed_description_ar,
          detailed_description_en: s.detailed_description_en,
          price_amount_halalas: s.price_amount_halalas,
          price_currency: s.price_currency,
          price_is_confirmed: s.price_is_confirmed,
          price_display_ar: s.price_display_ar,
          price_display_en: s.price_display_en,
          price_note_ar: s.price_note_ar,
          price_note_en: s.price_note_en,
          duration_minutes: s.duration_minutes,
          duration_is_confirmed: s.duration_is_confirmed,
          duration_display_ar: s.duration_display_ar,
          duration_display_en: s.duration_display_en,
          duration_note_ar: s.duration_note_ar,
          duration_note_en: s.duration_note_en,
          features_ar: s.features_ar,
          features_en: s.features_en,
          benefits_ar: s.benefits_ar,
          benefits_en: s.benefits_en,
          steps_ar: s.steps_ar,
          steps_en: s.steps_en,
          includes_ar: s.includes_ar,
          includes_en: s.includes_en,
          suitability_ar: s.suitability_ar,
          suitability_en: s.suitability_en,
          advisory_ar: s.advisory_ar,
          advisory_en: s.advisory_en,
          seo_title_ar: s.seo_title_ar,
          seo_title_en: s.seo_title_en,
          seo_description_ar: s.seo_description_ar,
          seo_description_en: s.seo_description_en,
          display_order: s.display_order,
          is_published: s.is_published,
          updated_at: now,
        })
        .where(eq(services.id, s.id));
    } else {
      // Insert new
      await db.insert(services).values({
        ...s,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // ==========================================================================
  // 3. MASSAGE MENU (6 TYPES & 18 DURATION OPTIONS)
  // ==========================================================================
  const massageMenuData = [
    {
      id: 'msg_relaxing',
      slug: 'menu-relaxing-massage',
      service_id: 'relaxation-massage',
      title_ar: 'المساج الاسترخائي',
      title_en: 'Relaxing Massage',
      subtitle_ar: 'هدوء وانسيابية عميقة للتخلص من الإجهاد اليومي',
      subtitle_en: 'Gentle restorative flow to dissolve everyday fatigue',
      description_ar: 'تدليك استرخائي كامل بانسيابية لطيفة وزيوت عطرية مهدئة لتهدئة الأعصاب وتحسين جودة النوم.',
      description_en: 'A full-body soothing massage with gentle rhythmic strokes and calming aromatics to ease mental tension and promote restful sleep.',
      display_order: 1,
      durations: [
        { minutes: 60, priceHalalas: 17500, priceAr: '175 ر.س', priceEn: '175 SAR' },
        { minutes: 90, priceHalalas: 27500, priceAr: '275 ر.س', priceEn: '275 SAR' },
        { minutes: 120, priceHalalas: 37500, priceAr: '375 ر.س', priceEn: '375 SAR' },
      ],
    },
    {
      id: 'msg_therapeutic',
      slug: 'menu-therapeutic-massage',
      service_id: 'therapeutic-massage',
      title_ar: 'المساج العلاجي',
      title_en: 'Therapeutic Massage',
      subtitle_ar: 'عناية تخصصية لمناطق التوتر والإجهاد العضلي',
      subtitle_en: 'Specialized clinical care targeting myofascial tension zones',
      description_ar: 'مساج تخصصي يستهدف النقاط العضلية الحيوية ومناطق التوتر لتخفيف الآلام والإجهاد العضلي.',
      description_en: 'A specialized clinical bodywork targeting critical muscular triggers and accumulated tension to relieve physical discomfort.',
      display_order: 2,
      durations: [
        { minutes: 60, priceHalalas: 18900, priceAr: '189 ر.س', priceEn: '189 SAR' },
        { minutes: 90, priceHalalas: 28900, priceAr: '289 ر.س', priceEn: '289 SAR' },
        { minutes: 120, priceHalalas: 38900, priceAr: '389 ر.س', priceEn: '389 SAR' },
      ],
    },
    {
      id: 'msg_deep_tissue',
      slug: 'menu-deep-tissue-massage',
      service_id: 'deep-tissue-massage',
      title_ar: 'مساج الأنسجة العميقة',
      title_en: 'Deep Tissue Massage',
      subtitle_ar: 'ضغط موجه وبطيء لتحرير العقد العضلية والتيبس',
      subtitle_en: 'Deep deliberate pressure releasing chronic knots and fascia stiffness',
      description_ar: 'تدليك بضغط مدروس وعميق لاختراق طبقات العضلات الداخلية وتفكيك الالتصاقات والتيبس المزمن.',
      description_en: 'Firm, deliberate pressure reaching deeper muscle layers and fascia to release chronic contractions and stiffness.',
      display_order: 3,
      durations: [
        { minutes: 60, priceHalalas: 19900, priceAr: '199 ر.س', priceEn: '199 SAR' },
        { minutes: 90, priceHalalas: 29900, priceAr: '299 ر.س', priceEn: '299 SAR' },
        { minutes: 120, priceHalalas: 39900, priceAr: '399 ر.س', priceEn: '399 SAR' },
      ],
    },
    {
      id: 'msg_prenatal',
      slug: 'menu-prenatal-postnatal-massage',
      service_id: null,
      title_ar: 'مساج قبل / بعد الولادة',
      title_en: 'Pre & Post Natal Massage',
      subtitle_ar: 'عناية فائقة للأمهات بوضعيات مريحة وداعمة',
      subtitle_en: 'Nurturing care for mothers in comforting, supportive postures',
      description_ar: 'عناية خاصة وفاخرة بالأمهات في وضعيات آمنة ومريحة لتخفيف آلام الظهر وتورم القدمين واستعادة راحة الجسم.',
      description_en: 'Gentle, caring therapy tailored specifically for expecting and new mothers in supportive postures to relieve backache and leg swelling.',
      display_order: 4,
      durations: [
        { minutes: 60, priceHalalas: 19900, priceAr: '199 ر.س', priceEn: '199 SAR' },
        { minutes: 90, priceHalalas: 29900, priceAr: '299 ر.س', priceEn: '299 SAR' },
        { minutes: 120, priceHalalas: 39900, priceAr: '399 ر.س', priceEn: '399 SAR' },
      ],
    },
    {
      id: 'msg_head_shoulders',
      slug: 'menu-head-shoulders-massage',
      service_id: null,
      title_ar: 'مساج الرأس والأكتاف',
      title_en: 'Head & Shoulders Massage',
      subtitle_ar: 'تركيز عميق لإزالة التوتر العصبي وصداع الإجهاد',
      subtitle_en: 'Focused relief to dissolve cranial tension and mental fatigue',
      description_ar: 'جلسة تدليك مركزة لأعلى الظهر والكتفين وفروة الرأس لتخفيف الصداع والإجهاد العصبي وتحفيز تدفق الدم.',
      description_en: 'A targeted therapeutic focus on the upper back, shoulders, neck, and scalp to dissipate tension headaches and mental fatigue.',
      display_order: 5,
      durations: [
        { minutes: 60, priceHalalas: 14500, priceAr: '145 ر.س', priceEn: '145 SAR' },
        { minutes: 90, priceHalalas: 24500, priceAr: '245 ر.س', priceEn: '245 SAR' },
        { minutes: 120, priceHalalas: 34500, priceAr: '345 ر.س', priceEn: '345 SAR' },
      ],
    },
    {
      id: 'msg_foot',
      slug: 'menu-foot-massage',
      service_id: null,
      title_ar: 'مساج الأقدام',
      title_en: 'Foot Massage',
      subtitle_ar: 'تدليك انعكاسي لتنشيط مراكز الطاقة وإزالة إجهاد المشي',
      subtitle_en: 'Restorative reflexology releasing walking fatigue and stimulating energy channels',
      description_ar: 'تدليك انعكاسي عميق للقدمين والساقين يزيل التعب والإرهاق وينشط مراكز الطاقة والدورة الدموية في كامل الجسم.',
      description_en: 'Deep foot reflexology and lower leg relief that melts away walking fatigue and stimulates vital meridian pathways throughout the body.',
      display_order: 6,
      durations: [
        { minutes: 60, priceHalalas: 14500, priceAr: '145 ر.س', priceEn: '145 SAR' },
        { minutes: 90, priceHalalas: 24500, priceAr: '245 ر.س', priceEn: '245 SAR' },
        { minutes: 120, priceHalalas: 34500, priceAr: '345 ر.س', priceEn: '345 SAR' },
      ],
    },
  ];

  for (const item of massageMenuData) {
    const existingType = await client.execute({
      sql: 'SELECT id FROM massage_types WHERE id = ?;',
      args: [item.id],
    });

    if (existingType.rows.length > 0) {
      await db
        .update(massageTypes)
        .set({
          slug: item.slug,
          service_id: item.service_id,
          title_ar: item.title_ar,
          title_en: item.title_en,
          subtitle_ar: item.subtitle_ar,
          subtitle_en: item.subtitle_en,
          description_ar: item.description_ar,
          description_en: item.description_en,
          display_order: item.display_order,
          is_active: 1,
          updated_at: now,
        })
        .where(eq(massageTypes.id, item.id));
    } else {
      await db.insert(massageTypes).values({
        id: item.id,
        slug: item.slug,
        service_id: item.service_id,
        title_ar: item.title_ar,
        title_en: item.title_en,
        subtitle_ar: item.subtitle_ar,
        subtitle_en: item.subtitle_en,
        description_ar: item.description_ar,
        description_en: item.description_en,
        display_order: item.display_order,
        is_active: 1,
        created_at: now,
        updated_at: now,
      });
    }

    // Insert or update duration variants
    for (const d of item.durations) {
      const varId = `var_${item.id}_${d.minutes}`;
      const varSlug = `${item.slug}-${d.minutes}min`;

      const existingVar = await client.execute({
        sql: 'SELECT id FROM service_variants WHERE id = ?;',
        args: [varId],
      });

      if (existingVar.rows.length > 0) {
        await db
          .update(serviceVariants)
          .set({
            price_amount_halalas: d.priceHalalas,
            price_display_ar: d.priceAr,
            price_display_en: d.priceEn,
            duration_minutes: d.minutes,
            duration_display_ar: `${d.minutes} دقيقة`,
            duration_display_en: `${d.minutes} Minutes`,
            is_active: 1,
            updated_at: now,
          })
          .where(eq(serviceVariants.id, varId));
      } else {
        await db.insert(serviceVariants).values({
          id: varId,
          massage_type_id: item.id,
          service_id: item.service_id,
          slug: varSlug,
          duration_minutes: d.minutes,
          duration_display_ar: `${d.minutes} دقيقة`,
          duration_display_en: `${d.minutes} Minutes`,
          price_amount_halalas: d.priceHalalas,
          price_currency: 'SAR',
          price_display_ar: d.priceAr,
          price_display_en: d.priceEn,
          display_order: d.minutes,
          is_active: 1,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  // ==========================================================================
  // 4. OFFERS (3 OFFERS)
  // ==========================================================================
  const officialOffers = [
    {
      id: 'offer-relax-30',
      slug: 'offer-relax-30',
      image_id: 'med_srv_relaxation_massage',
      badge_ar: 'عرض مميز',
      badge_en: 'Special Offer',
      title_ar: 'مساج استرخاء 30 دقيقة',
      title_en: '30-Minute Relaxation Massage',
      subtitle_ar: 'جلسة سريعة ومركزة لتجديد النشاط والحيوية',
      subtitle_en: 'Quick restorative break to recharge vitality',
      description_ar: 'جلسة مساج استرخائي سريعة ومركزة لتجديد النشاط وتخفيف التوتر في 30 دقيقة.',
      description_en: 'A quick, focused 30-minute relaxation massage designed to refresh vitality and release daily stress.',
      includes_ar: ['مساج استرخائي مركز 30 دقيقة', 'زيوت عطرية طبيعية مهدئة'],
      includes_en: ['30-minute focused relaxation massage', 'Calming natural essential oils'],
      price_amount_halalas: 9600, // 96 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '96 ر.س',
      price_display_en: '96 SAR',
      duration_minutes: 30,
      duration_is_confirmed: 1,
      duration_display_ar: '30 دقيقة',
      duration_display_en: '30 Minutes',
      starts_at: null, // Strictly null: no invented dates
      expires_at: null,
      is_featured: 1,
      is_active: 1,
      display_order: 1,
    },
    {
      id: 'offer-relax-30-pedi-mani',
      slug: 'offer-relax-30-pedi-mani',
      image_id: 'med_srv_pedicure_manicure',
      badge_ar: 'باقة التوفير',
      badge_en: 'Value Combo',
      title_ar: 'مساج استرخاء 30 دقيقة + بدكير ومنكير',
      title_en: '30-Min Relaxation Massage + Pedicure & Manicure',
      subtitle_ar: 'عناية مزدوجة تجمع بين هدوء التدليك ونضارة الأظافر',
      subtitle_en: 'Dual care combining soothing bodywork with flawless nail grooming',
      description_ar: 'تجربة عناية مزدوجة تجمع بين مساج استرخائي لمدة 30 دقيقة وجلسة بدكير ومنكير متكاملة لليدين والقدمين.',
      description_en: 'A dual wellness experience combining a 30-minute relaxation massage with a complete manicure and pedicure treatment.',
      includes_ar: ['مساج استرخاء 30 دقيقة', 'بدكير ومنكير فاخر لليدين والقدمين'],
      includes_en: ['30-minute relaxation massage', 'Luxury manicure & pedicure for hands and feet'],
      price_amount_halalas: 24900, // 249 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '249 ر.س',
      price_display_en: '249 SAR',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      starts_at: null,
      expires_at: null,
      is_featured: 1,
      is_active: 1,
      display_order: 2,
    },
    {
      id: 'offer-relax-30-moroccan-bath',
      slug: 'offer-relax-30-moroccan-bath',
      image_id: 'med_srv_moroccan_bath',
      badge_ar: 'الأكثر طلباً',
      badge_en: 'Most Popular',
      title_ar: 'مساج استرخاء 30 دقيقة + حمام مغربي',
      title_en: '30-Min Relaxation Massage + Moroccan Bath',
      subtitle_ar: 'توليفة الدفء والنقاء الملكي للاستجمام التام',
      subtitle_en: 'Royal warming purification combo for ultimate unwinding',
      description_ar: 'باقة الدفء والراحة التي تجمع بين الحمام المغربي التقليدي بالصابون البلدي ومساج استرخائي 30 دقيقة.',
      description_en: 'A warming, rejuvenating package combining traditional Moroccan hammam with black soap and a 30-minute relaxation massage.',
      includes_ar: ['مساج استرخاء 30 دقيقة', 'حمام مغربي تقليدي فاخر'],
      includes_en: ['30-minute relaxation massage', 'Luxury traditional Moroccan bath'],
      price_amount_halalas: 21900, // 219 SAR
      price_currency: 'SAR',
      price_is_confirmed: 1,
      price_display_ar: '219 ر.س',
      price_display_en: '219 SAR',
      duration_minutes: null,
      duration_is_confirmed: 0,
      duration_display_ar: 'تحدد عند الحجز',
      duration_display_en: 'Confirmed upon booking',
      starts_at: null,
      expires_at: null,
      is_featured: 1,
      is_active: 1,
      display_order: 3,
    },
  ];

  for (const o of officialOffers) {
    const existing = await client.execute({
      sql: 'SELECT id FROM offers WHERE id = ?;',
      args: [o.id],
    });

    if (existing.rows.length > 0) {
      await db
        .update(offers)
        .set({
          slug: o.slug,
          image_id: o.image_id,
          badge_ar: o.badge_ar,
          badge_en: o.badge_en,
          title_ar: o.title_ar,
          title_en: o.title_en,
          subtitle_ar: o.subtitle_ar,
          subtitle_en: o.subtitle_en,
          description_ar: o.description_ar,
          description_en: o.description_en,
          includes_ar: o.includes_ar,
          includes_en: o.includes_en,
          price_amount_halalas: o.price_amount_halalas,
          price_currency: o.price_currency,
          price_is_confirmed: o.price_is_confirmed,
          price_display_ar: o.price_display_ar,
          price_display_en: o.price_display_en,
          duration_minutes: o.duration_minutes,
          duration_is_confirmed: o.duration_is_confirmed,
          duration_display_ar: o.duration_display_ar,
          duration_display_en: o.duration_display_en,
          starts_at: o.starts_at,
          expires_at: o.expires_at,
          is_featured: o.is_featured,
          is_active: o.is_active,
          display_order: o.display_order,
          updated_at: now,
        })
        .where(eq(offers.id, o.id));
    } else {
      await db.insert(offers).values({
        ...o,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // ==========================================================================
  // 5. PACKAGES (3 STANDARD + 4 SPECIAL PACKAGES)
  // ==========================================================================
  const allPackages = [
    // Standard Packages
    {
      id: 'pkg_relax_pedi_mani',
      slug: 'package-relax-pedicure-manicure',
      package_type: 'standard',
      title_ar: 'بكج مساج ريلاكس وبدكير ومنكير',
      title_en: 'Relax Massage & Pedicure-Manicure Package',
      subtitle_ar: 'تناغم الاسترخاء والعناية الفائقة بأظافر اليدين والقدمين',
      subtitle_en: 'A seamless blend of body unwinding and meticulous nail elegance',
      description_ar: 'باقة استرخاء وعناية متكاملة تجمع بين جلسة مساج ريلاكس كاملة وبدكير ومنكير فاخر لليدين والقدمين.',
      description_en: 'A comprehensive pampering package pairing a full relaxation massage with a luxury manicure and pedicure.',
      includes_ar: ['جلسة مساج ريلاكس كاملة', 'بدكير ومنكير فاخر', 'ضيافة مشروبات الأعشاب'],
      includes_en: ['Full relaxation massage session', 'Luxury pedicure & manicure', 'Herbal wellness beverages'],
      price_amount_halalas: 29600, // 296 SAR
      price_currency: 'SAR',
      price_display_ar: '296 ر.س',
      price_display_en: '296 SAR',
      badge_ar: 'بكج التوازن',
      badge_en: 'Balance Package',
      image_id: 'med_srv_relaxation_massage',
      display_order: 1,
      is_active: 1,
    },
    {
      id: 'pkg_relax_hammam',
      slug: 'package-relax-moroccan-bath',
      package_type: 'standard',
      title_ar: 'بكج مساج ريلاكس وحمام مغربي',
      title_en: 'Relax Massage & Moroccan Bath Package',
      subtitle_ar: 'طقوس النقاء بالصابون البلدي مع انسيابية المساج الهادئ',
      subtitle_en: 'Purifying black soap hammam paired with deeply calming bodywork',
      description_ar: 'باقة النقاء والسكينة التي تدمج طقوس الحمام المغربي بالبخار والصابون البلدي مع جلسة مساج ريلاكس هادئة.',
      description_en: 'A purification ritual harmonizing steam Moroccan hammam with traditional black soap and a deeply calming relaxation massage.',
      includes_ar: ['حمام مغربي فاخر بالصابون البلدي', 'جلسة مساج ريلاكس هادئة', 'ترطيب غني ونعومة فائقة'],
      includes_en: ['Royal Moroccan hammam ritual', 'Gentle relaxation massage', 'Deep hydrating finish'],
      price_amount_halalas: 29600, // 296 SAR
      price_currency: 'SAR',
      price_display_ar: '296 ر.س',
      price_display_en: '296 SAR',
      badge_ar: 'بكج النقاء',
      badge_en: 'Purity Package',
      image_id: 'med_srv_moroccan_bath',
      display_order: 2,
      is_active: 1,
    },
    {
      id: 'pkg_relax_pedi_mani_hammam',
      slug: 'package-relax-pedi-mani-moroccan-bath',
      package_type: 'standard',
      title_ar: 'بكج مساج ريلاكس وبدكير ومنكير وحمام مغربي',
      title_en: 'Relax Massage, Pedicure-Manicure & Moroccan Bath Package',
      subtitle_ar: 'التجربة الملكية الثلاثية الشاملة للاستجمام والجمال',
      subtitle_en: 'The definitive triple royal sanctuary experience',
      description_ar: 'التجربة الملكية الشاملة التي تجمع خدمات السبا الأساسية الثلاث في جلسة استجمام متكاملة.',
      description_en: 'The ultimate royal spa journey bringing together all three signature treatments in one indulgent session.',
      includes_ar: ['حمام مغربي ملكي كامل', 'جلسة مساج ريلاكس', 'بدكير ومنكير متكامل', 'ضيافة خاصة'],
      includes_en: ['Complete royal Moroccan bath', 'Full relaxation massage', 'Complete pedicure & manicure', 'Private lounge service'],
      price_amount_halalas: 39600, // 396 SAR
      price_currency: 'SAR',
      price_display_ar: '396 ر.س',
      price_display_en: '396 SAR',
      badge_ar: 'البكج الشامل',
      badge_en: 'All-Inclusive',
      image_id: 'med_srv_body_sculpting_drainage',
      display_order: 3,
      is_active: 1,
    },

    // Special Packages
    {
      id: 'pkg_special_gift',
      slug: 'special-gift-package',
      package_type: 'special',
      title_ar: 'باقة الإهداء',
      title_en: 'The Gifting Experience Package',
      subtitle_ar: 'هدية راقية للتعبير عن المحبة والتقدير بلمسات السبا والورد',
      subtitle_en: 'An exquisite gift of pure pampering paired with fresh florals',
      description_ar: 'هدية مثالية لمن تحبين تعبّر عن التقدير والاهتمام مع تجربة استرخاء فاخرة وباقة ورد أنيقة.',
      description_en: 'A heartfelt gift to cherish someone special, featuring a relaxing spa day paired with a fresh flower bouquet.',
      includes_ar: ['مساج استرخائي', 'بدكير ومنكير', 'باقة ورد أنيقة'],
      includes_en: ['Relaxation massage', 'Pedicure & manicure', 'Fresh floral bouquet'],
      price_amount_halalas: 35000, // 350 SAR
      price_currency: 'SAR',
      price_display_ar: '350 ر.س',
      price_display_en: '350 SAR',
      badge_ar: 'إهداء فاخر',
      badge_en: 'Luxury Gifting',
      image_id: 'med_gal_1',
      display_order: 4,
      is_active: 1,
    },
    {
      id: 'pkg_special_diamond',
      slug: 'special-diamond-package',
      package_type: 'special',
      title_ar: 'الباقة الماسية',
      title_en: 'The Diamond VIP Package',
      subtitle_ar: 'أعلى درجات الدلال الملكي المتكامل لإطلالة استثنائية',
      subtitle_en: 'The absolute pinnacle of VIP royal care and beauty',
      description_ar: 'باقة الدلال الفائق الشاملة لكافة طقوس العناية والجمال الملكية لإطلالة ساحرة وشعور متجدد بالحيوية.',
      description_en: 'The pinnacle of luxury self-care covering all five signature beauty and bodywork rituals for total renewal.',
      includes_ar: ['مساج استرخائي', 'حمام مغربي', 'استشوار', 'شمع للوجه', 'بدكير ومنكير'],
      includes_en: ['Relaxation massage', 'Royal Moroccan bath', 'Hair styling blow-dry', 'Facial waxing', 'Pedicure & manicure'],
      price_amount_halalas: 59900, // 599 SAR
      price_currency: 'SAR',
      price_display_ar: '599 ر.س',
      price_display_en: '599 SAR',
      badge_ar: 'الأكثر تميزاً',
      badge_en: 'VIP Signature',
      image_id: 'med_gal_2',
      display_order: 5,
      is_active: 1,
    },
    {
      id: 'pkg_special_complete_care',
      slug: 'special-complete-care-package',
      package_type: 'special',
      title_ar: 'باقة العناية المتكاملة',
      title_en: 'Complete Care Package',
      subtitle_ar: 'جلسات مساج مضاعفة وعناية متقنة بالأظافر للراحة التامة',
      subtitle_en: 'Dual massage therapy paired with precision nail beautification',
      description_ar: 'باقة صُممت لتقديم عناية مضاعفة وممتدة مع جلستي مساج متتاليتين وجلسة بدكير ومنكير متألقة.',
      description_en: 'Designed for deep rejuvenation featuring two massage sessions combined with meticulous nail grooming.',
      includes_ar: ['جلستان مساج', 'بدكير ومنكير'],
      includes_en: ['Two massage sessions', 'Pedicure & manicure'],
      price_amount_halalas: 33000, // 330 SAR
      price_currency: 'SAR',
      price_display_ar: '330 ر.س',
      price_display_en: '330 SAR',
      badge_ar: 'عناية مضاعفة',
      badge_en: 'Dual Care',
      image_id: 'med_gal_5',
      display_order: 6,
      is_active: 1,
    },
    {
      id: 'pkg_special_friends',
      slug: 'special-friends-package',
      package_type: 'special',
      title_ar: 'باقة الصديقات',
      title_en: 'Friends Sanctuary Package',
      subtitle_ar: 'لحظات استجمام مشتركة بخيارات حجز منفصلة تلبي رغباتكما',
      subtitle_en: 'Shared sanctuary moments with distinct individual choices',
      description_ar: 'باقة مميزة لمشاركة أجواء الاستجمام مع صديقتكِ، تتضمن ثلاثة خيارات منفصلة تلبي رغباتكما المختلفة دون دمج الأسعار.',
      description_en: 'A special experience to share serene moments with your closest friend, featuring three distinct options tailored to your preference.',
      includes_ar: ['أجواء استجمام مشتركة', 'ثلاثة خيارات حجز منفصلة', 'ضيافة خاصة'],
      includes_en: ['Shared sanctuary ambiance', 'Three distinct booking options', 'Signature hospitality'],
      price_amount_halalas: null, // Distinct options! Not a combined price
      price_currency: 'SAR',
      price_display_ar: 'خيارات تبدأ من 259 ر.س',
      price_display_en: 'Options from 259 SAR',
      badge_ar: 'لحظات مشتركة',
      badge_en: 'Shared Moments',
      image_id: 'med_gal_4',
      display_order: 7,
      is_active: 1,
    },
  ];

  for (const p of allPackages) {
    const existing = await client.execute({
      sql: 'SELECT id FROM packages WHERE id = ?;',
      args: [p.id],
    });

    if (existing.rows.length > 0) {
      await db
        .update(packages)
        .set({
          slug: p.slug,
          package_type: p.package_type,
          title_ar: p.title_ar,
          title_en: p.title_en,
          subtitle_ar: p.subtitle_ar,
          subtitle_en: p.subtitle_en,
          description_ar: p.description_ar,
          description_en: p.description_en,
          includes_ar: p.includes_ar,
          includes_en: p.includes_en,
          price_amount_halalas: p.price_amount_halalas,
          price_currency: p.price_currency,
          price_display_ar: p.price_display_ar,
          price_display_en: p.price_display_en,
          badge_ar: p.badge_ar,
          badge_en: p.badge_en,
          image_id: p.image_id,
          display_order: p.display_order,
          is_active: p.is_active,
          updated_at: now,
        })
        .where(eq(packages.id, p.id));
    } else {
      await db.insert(packages).values({
        ...p,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // ==========================================================================
  // 6. FRIENDS PACKAGE OPTIONS (3 DISTINCT OPTIONS)
  // ==========================================================================
  const friendsOptions = [
    {
      id: 'opt_friends_hammam',
      package_id: 'pkg_special_friends',
      slug: 'friends-option-moroccan-bath',
      title_ar: 'خيار الحمام المغربي',
      title_en: 'Moroccan Bath Option',
      description_ar: 'طقوس الحمام المغربي الفاخر بالصابون البلدي والبخار الدافئ لصديقتين في أجواء ملؤها الخصوصية والراحة.',
      description_en: 'Royal Moroccan bath hammam experience with authentic black soap and steam for two companions.',
      price_amount_halalas: 25900, // 259 SAR
      price_currency: 'SAR',
      price_display_ar: '259 ر.س',
      price_display_en: '259 SAR',
      display_order: 1,
      is_active: 1,
    },
    {
      id: 'opt_friends_pedi',
      package_id: 'pkg_special_friends',
      slug: 'friends-option-pedicure-manicure',
      title_ar: 'خيار البدكير والمنكير',
      title_en: 'Pedicure & Manicure Option',
      description_ar: 'عناية وتجميل متكامل للأظافر واليدين والقدمين لكِ ولصديقتكِ بأدوات معقمة وزبدة الشيا الطبيعية.',
      description_en: 'Complete nail beautification and hand & foot hydration with sterilized tools for you and your friend.',
      price_amount_halalas: 27900, // 279 SAR
      price_currency: 'SAR',
      price_display_ar: '279 ر.س',
      price_display_en: '279 SAR',
      display_order: 2,
      is_active: 1,
    },
    {
      id: 'opt_friends_relax',
      package_id: 'pkg_special_friends',
      slug: 'friends-option-relax-massage',
      title_ar: 'خيار المساج الاسترخائي',
      title_en: 'Relaxation Massage Option',
      description_ar: 'جلسة تدليك استرخائي هادئة بالزيوت العطرية النقية لفك الإرهاق والاستمتاع بلحظات صفاء مشتركة.',
      description_en: 'Soothing relaxation massage sessions with natural aromatic oils for two companions to unwind together.',
      price_amount_halalas: 29900, // 299 SAR
      price_currency: 'SAR',
      price_display_ar: '299 ر.س',
      price_display_en: '299 SAR',
      display_order: 3,
      is_active: 1,
    },
  ];

  for (const opt of friendsOptions) {
    const existing = await client.execute({
      sql: 'SELECT id FROM package_options WHERE id = ?;',
      args: [opt.id],
    });

    if (existing.rows.length > 0) {
      await db
        .update(packageOptions)
        .set({
          slug: opt.slug,
          title_ar: opt.title_ar,
          title_en: opt.title_en,
          description_ar: opt.description_ar,
          description_en: opt.description_en,
          price_amount_halalas: opt.price_amount_halalas,
          price_currency: opt.price_currency,
          price_display_ar: opt.price_display_ar,
          price_display_en: opt.price_display_en,
          display_order: opt.display_order,
          is_active: opt.is_active,
          updated_at: now,
        })
        .where(eq(packageOptions.id, opt.id));
    } else {
      await db.insert(packageOptions).values({
        ...opt,
        created_at: now,
        updated_at: now,
      });
    }
  }

  console.log('✓ [ALOR SPA Content Integration] Database sync completed successfully!');
}

// Execute directly if run via CLI
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('seed-authoritative-content.ts') || 
  process.argv[1].endsWith('seed-authoritative-content.js')
);

if (isDirectRun) {
  seedAuthoritativeContent()
    .then(() => {
      console.log('All authoritative data successfully integrated into SQLite.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Content integration failed:', err);
      process.exit(1);
    });
}
