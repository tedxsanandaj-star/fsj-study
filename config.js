/* ══════════════════════════════════════════════════════════════════
   config.js — تنها فایلی که شما باید ویرایش کنید (نسخهٔ یکپارچه ۸٫۰)

   فقط ۵ مقدار «بخش ۱» را پر کنید. بقیه را دست نزنید.
   بعد از ویرایش، فایل را ذخیره کنید و در GitHub بارگذاری نمایید (راهنما: docs/00_START_HERE_FA.md).
   ══════════════════════════════════════════════════════════════════ */

window.CFG = {

  /* ═══════════ بخش ۱ — پنج مقدار اجباری ═══════════ */

  /* ۱. آدرس Web App در Google Apps Script؛ باید با /exec تمام شود. */
  API_URL: 'AKfycbyrsjYGqLbxrdC06nsad8z_v-qK62snl37F-cSx6t00V9jVawYivfoTCmgtwiWmo7NLLA',

  /* ۲. محل تصاویر چهره (داخل همین مخزن) — تغییر ندهید. */
  FACES_BASE: 'faces/',

  /* ۳. دو ویدیو. VIDEO_A = ویدیوی مداخله (گروه ۱)؛ VIDEO_B = ویدیوی کنترل (گروه ۰).
        اگر جای این دو را اشتباه بگذارید، نتیجهٔ کل مطالعه وارونه می‌شود. بعد از تنظیم، check.html را باز کنید. */
  VIDEO_A: 'video/A.mp4',
  VIDEO_B: 'video/B.mp4',
  VIDEO_A_ALT: '',
  VIDEO_B_ALT: '',

  /* ۴. آدرس عمومی مطالعه، مثلاً 'https://myname.github.io/fsj-study/' */
  SITE_BASE: 'https://tedxsanandaj-star.github.io/fsj-study/',

  /* ۵. ایمیل تماس برای شرکت‌کنندگان */
  CONTACT_EMAIL: 'tedxsanandaj@gmail.com',


  /* ═══════════ بخش ۲ — فقط در صورت نیاز ═══════════ */

  STUDY_VERSION: 'FSJ-P1-UNIFIED-8.0',

  /* زمان اعلام‌شده در رضایت‌نامه. برآورد مستند ≈ ۳۵–۴۰ دقیقه (میانه)؛ بعد از آزمون ۵ نفره و پس از جمع‌آوری ۵۰ نفر اول با
     python analysis/run_analysis.py (فایل 00_duration.csv) اصلاح کنید تا اعلام رضایت با واقعیت بخواند. */
  EXPECTED_MINUTES: '35 تا 40',

  /* تخصیص تصادفی: 'server' = بلوک‌های جایگشتیِ ۸تایی در Apps Script (توصیه‌شده، مبنای پیش‌ثبت)
                    'client' = تصادفی‌سازی ساده در مرورگر (فقط برای آزمایش) */
  ALLOCATION: 'server',
  ALLOCATION_TIMEOUT_MS: 8000,

  DEBRIEF_TEXT: '',            // خالی = متن پیش‌فرض صفحهٔ پایان

  /* مهلت پاسخ (میلی‌ثانیه). صفر = بدون مهلت. عمداً سخاوتمندانه است. */
  TIMEOUT_FSJ:        60000,
  FSJ_BREAK_MS:           0,
  TIMEOUT_TRUST:      45000,
  TIMEOUT_STA:        12000,
  TIMEOUT_QUESTION:       0,

  /* نسخهٔ «تأخیردار» تکلیف چهره */
  DELAY_TARGET_MS:     1200,
  DELAY_MASK_MS:        500,

  /* نمایش چهره در ارزیابی سریع اعتماد (STA) */
  STA_FACE_MS:          500,

  /* حداقل درصد ویدیو که باید دیده شود تا دکمهٔ ادامه فعال شود */
  VIDEO_MIN_WATCH:      0.97,

  /* ارسال داده */
  SEND_RETRIES:             5,
  SEND_RETRY_DELAY:      2500,

  /* ترتیب مراحل: 'end' = پرسشنامه‌های بلند (آشنایی‌ها، CMCQ) در پایان (کاهش ریزش)؛ 'start' = ترتیب قدیمی */
  TRAIT_POSITION:       'end',

  ENABLE_STA:            true,

  /* حالت آزمایش: داده واقعی ثبت نمی‌شود. قبل از انتشار حتماً false. */
  DEBUG: false
};
