/**
 * Privacy Statement copy for /privacy.
 *
 * Single source of truth for the wording rendered by `src/pages/PrivacyPage.vue`
 * and for the head tags `scripts/prerender.ts` writes into `dist/privacy.html`,
 * so the Vue page and the shipped document cannot disagree on title/description.
 *
 * Required by the Wikimedia Cloud Services Terms of Use for Administrators and
 * Developers §7.3.2, because this project is a non-WMF, non-Toolforge WMCS
 * project that collects Wikimedia Usernames (§7.3.1). The section-by-section
 * mapping is recorded in `PRIVACY_REQUIREMENTS` below and asserted by
 * `src/content/__tests__/privacy.test.ts`, so a future content pass cannot
 * quietly drop a mandated element.
 *
 * Uses relative imports only: the module is loaded both by Vite (`@/…` alias)
 * and by the prerender/verify scripts via `tsx`, which resolve `../src/...`.
 *
 * ## Style
 *
 * The English copy follows ASD-STE100 Simplified Technical English as far as a
 * legal document can: one idea per sentence, present tense, active voice, short
 * sentences (≤20 words), approved vocabulary, and no detail that no reader needs
 * to act on. `privacy.test.ts` enforces the sentence limit and a word budget.
 *
 * Three carve-outs, all deliberate:
 *  - `PRIVACY_DISCLAIMER` is mandated text. §7.3.2 requires the statement to end
 *    with the concepts quoted in the Terms, so it is kept verbatim, long
 *    sentences and all, and the style tests skip it.
 *  - `PRIVACY_POLICY_LINK_LABELS.adminTerms` / `.endUserTerms` are the actual
 *    titles of the documents they link to. Renaming a document in a link label
 *    would misname it.
 *  - The `az` copy is written by the project, not generated. §11 makes English
 *    authoritative on any difference in meaning.
 *
 * Legal terms the Terms themselves define — "Personal Information", "Wikimedia
 * username", "Terms of Use" — are kept as written. STE has no vocabulary for
 * legal concepts, so these are used as defined terms rather than simplified.
 */

import { SITE_HOST } from "../utils/constants";

/**
 * `<title>` for /privacy.
 *
 * Mirrors the `${pageTitle} | ${SITE_TITLE}` string scripts/prerender.ts
 * builds for every static page, so the title in the prerendered document and
 * the one the runtime head sets are byte-identical and nothing swaps on mount.
 */
export const PRIVACY_TITLE = "Məxfilik Bəyannaməsi | Viki Abidələri Sevir Azərbaycan";

export const PRIVACY_CANONICAL = `${SITE_HOST}/privacy`;

/** Social card image — the site logo, matching every other static page. */
export const PRIVACY_SOCIAL_IMAGE = `${SITE_HOST}/wlm-az.png`;

/**
 * Meta description for /privacy, shared with scripts/prerender.ts so the
 * prerendered document and the runtime head carry byte-identical text and
 * nothing is rewritten after hydration.
 */
export const PRIVACY_DESCRIPTION =
   "How wikilovesmonuments.az handles Personal Information: the Wikimedia " +
   "username and OAuth token collected at sign-in, IP addresses in server " +
   "logs, uploads sent to Wikimedia Commons, retention periods, security " +
   "measures, and your rights.";

/** Label used in the breadcrumb trail, which is Azerbaijani-only chrome. */
export const PRIVACY_CRUMB = "Məxfilik Bəyannaməsi";

/** Both statements ship; English is authoritative under WMCS ToU §11. */
export const PRIVACY_LANGUAGES = ["English", "Azərbaycan dili"] as const;

/** The project name as the policy refers to itself. */
export const PRIVACY_PROJECT = "Wiki Loves Monuments Azerbaijan";

/** Canonical Wikimedia policy documents this statement is required to link. */
export const PRIVACY_POLICY_LINKS = {
   /** §7.3.1: a conspicuous English homepage link is mandatory. */
   home: "/",
   /** §7.3.2: administrators are bound by the admins/developers ToU. */
   adminTerms: "https://wikitech.wikimedia.org/wiki/Cloud_Services_Terms_of_use",
   /** §9.1: the End User ToU must be conspicuously linked from the homepage. */
   endUserTerms: "https://wikitech.wikimedia.org/wiki/Cloud_Services_End_User_Terms_of_use",
   /** §7.3.2: the WMF Privacy Policy this project is *not* governed by. */
   wmfPrivacy: "https://foundation.wikimedia.org/wiki/Policy:Privacy_policy",
   /** §7.3.2: where to report an exposure of Personal Information. */
   reportEmail: "privacy@wikimedia.org",
} as const;

/**
 * The legal links rendered in the persistent footer strip (see src/App.vue).
 *
 * WMCS ToU §7.3.1 requires the Privacy Statement to be linked conspicuously
 * from the project homepage, and §9.1 requires the End User Terms of Use to be
 * conspicuously linked from it as well. A footer that is on every page — rather
 * than a link buried on one — is what makes the link conspicuous, so these
 * three live in the app shell instead of on any single page.
 */
export const PRIVACY_FOOTER_LINKS = [
   {
      label: "Məxfilik Bəyannaməsi",
      /** Internal route: rendered as a <router-link>, so it stays a client-side nav. */
      to: "/privacy",
      /** English label, so the link is identifiable to a reader who does not speak Azerbaijani. */
      labelEn: "Privacy Statement",
      /** Renders a <router-link> rather than an off-site <a>. */
      external: false,
   },
   {
      label: "WMCS şərtləri (istifadəçi)",
      to: PRIVACY_POLICY_LINKS.endUserTerms,
      labelEn: "Wikimedia Cloud Services Terms of Use for End Users",
      external: true,
   },
   {
      label: "WMCS şərtləri (admin)",
      to: PRIVACY_POLICY_LINKS.adminTerms,
      labelEn: "Wikimedia Cloud Services Terms of Use for Administrators and Developers",
      external: true,
   },
] as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 1 — document title
// ---------------------------------------------------------------------------

export const PRIVACY_INTRO = {
   title: {
      en: `Privacy Statement of ${PRIVACY_PROJECT}`,
      az: `${PRIVACY_PROJECT} Məxfilik Bəyannaməsi`,
   },
   /**
    * The three facts the statement has to carry before anything else: volunteers
    * run the project, WMCS hosts it, and WMF neither runs nor represents it.
    * Spelled out on first use, then abbreviated, per the STE rules on nouns.
    */
   administeredBy: {
      en: `Wikimedia community volunteers run this project. Wikimedia Cloud Services (WMCS) hosts this project. WMCS is a hosting service for Wikimedia community developers. The Wikimedia Foundation ("WMF", "we", "our", or "us") provides WMCS. WMF does not run this project. WMF does not represent this project.`,
      az: `Bu layihə Vikipediya icmasının könüllüləri tərəfindən idarə olunur. Layihə Vikimedia Fondu ("VF", "biz", "bizim" və ya "bizə") tərəfindən Vikipediya icmasının tərtibatçıları üçün təqdim olunan hosting xidməti olan Wikimedia Cloud Services üzərində yerləşdirilib. Layihə Vikimedia Fondu tərəfindən idarə olunmur və Vikimedia Fondunu təmsil etmir.`,
   },
} as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 2 — what is collected, why, and for how long
// ---------------------------------------------------------------------------

export const PRIVACY_COLLECT_HEADING = {
   en: "What we collect",
   az: "Nəyi toplayırıq",
} as const;

/** Column headings and caption for PRIVACY_DATA_TABLE. */
export const PRIVACY_TABLE_HEADERS = {
   caption: {
      en: "Type of Personal Information, how we use it, and how long we keep it",
      az: "Şəxsi məlumatın növü, istifadəsi və saxlanma müddəti",
   },
   type: { en: "Information", az: "Məlumat" },
   use: { en: "How we use it", az: "Necə istifadə edirik" },
   retention: { en: "How long we keep it", az: "Nə qədər saxlayırıq" },
} as const;

/** One row of the "type of information / use / storage duration" table. */
export interface PrivacyDataRow {
   /** Information type, as named in the policy. */
   readonly type: { en: string; az: string };
   /** What the project does with it. */
   readonly use: { en: string; az: string };
   /** Deletion/retention period. */
   readonly retention: { en: string; az: string };
}

/**
 * Every category of Personal Information the project can receive, derive,
 * store, or log. Mirrors the code:
 *  - Wikimedia username + id: src/auth/passport.ts (`profile.displayName`/`id`)
 *  - OAuth token + secret:   src/auth/passport.ts, persisted by passport's
 *                            serializeUser into the Redis session store
 *  - IP address:             nginx access log, plus rate-limit keys
 *  - User-Agent:             nginx access log
 *  - Upload data + EXIF/GPS: src/routes/upload.ts, forwarded to Commons
 */
export const PRIVACY_DATA_TABLE: readonly PrivacyDataRow[] = [
   {
      type: {
         en: "Wikimedia username",
         az: "Vikipediya istifadəçi adı",
      },
      use: {
         en: "It identifies you after you sign in. We use it to link your uploads to your Commons account. Wikimedia Commons checks your password, not this project.",
         az: "Daxil olduqdan sonra sizi müəyyən etmək və yükləmələrinizi Commons hesabınızla əlaqələndirmək üçün. Kimliyin təsdiqi Wikimedia Commons-da həyata keçirilir; bu layihə parolunuzu heç vaxt əldə etmir.",
      },
      retention: {
         en: "Up to 7 days. We delete it when you sign out, or at the end of those 7 days.",
         az: "Sessiya müddəti ərzində, ən çoxu 7 gün. Çıxış etdikdə və ya bu müddət başa çatdıqda avtomatik olaraq serverimizdən silinir.",
      },
   },
   {
      type: {
         en: "Wikimedia user ID",
         az: "Vikipediya istifadəçi ID-si",
      },
      use: {
         en: "It tells accounts with the same name apart. It stops your session from mixing with another user's session.",
         az: "Eyni istifadəçi adına malik hesabları fərqləndirmək və bununla da sessiyanızın başqa istifadəçinin sessiyası ilə qarışmasının qarşısını almaq üçün.",
      },
      retention: {
         en: "The same as your username.",
         az: "Vikipediya istifadəçi adınızla eyni müddətdə.",
      },
   },
   {
      type: {
         en: "Wikimedia email address",
         az: "Vikipediya e-poçt ünvanı",
      },
      use: {
         en: "We do not collect it. Wikimedia's OAuth flow does not give it to us. We never ask for it.",
         az: "Toplanmır. Vikipediyanın OAuth axını bu məlumatı layihəyə təqdim etmir və biz də onu heç vaxt istəmirik.",
      },
      retention: {
         en: "Not applicable. We never collect it.",
         az: "Tətbiq edilmir — heç vaxt toplanmır.",
      },
   },
   {
      type: {
         en: "OAuth access token and token secret",
         az: "OAuth giriş tokeni və token sirri",
      },
      use: {
         en: "It signs your uploads as you on Wikimedia Commons. It stays on our server. We never send it to your browser. We never put it in an API response.",
         az: "Yükləmək qərarına gəldiyiniz fotoşəkli sizin hesabınızdan yükləmək üçün Wikimedia Commons-da kimliyinizi təsdiqləmək məqsədilə istifadə olunur. Token heç vaxt brauzerinizə göndərilmir və heç bir cavabda təqdim edilmir.",
      },
      retention: {
         en: "Up to 7 days. We delete it when you sign out. This project does not revoke the token at Wikimedia. You can revoke it in your Commons preferences.",
         az: "Sessiya müddəti ərzində, ən çoxu 7 gün və çıxış etdikdə silinir. Bu layihə çıxış etdiyiniz zaman Wikimedia-da tokeni ləğv etmir; istənilən vaxt Commons hesabınızın parametrlərindən giriş icazəsini ləğv edə bilərsiniz.",
      },
   },
   {
      type: {
         en: "Session identifier",
         az: "Sessiya identifikatoru",
      },
      use: {
         en: "It keeps you signed in. It stops session fixation attacks. It stops cross-site request forgery attacks.",
         az: "Sizi sistemdə tanımaq və giriş prosesini sessiyanın sabitlənməsi və saytlararası sorğunun saxtalaşdırılması hücumlarından qorumaq üçün istifadə olunur.",
      },
      retention: {
         en: "Up to 7 days, or until you sign out.",
         az: "Ən çoxu 7 gün və ya çıxış etdiyinizədək.",
      },
   },
   {
      type: {
         en: "IP address",
         az: "IP ünvanı",
      },
      use: {
         en: "It is in our web server access log. We use it to rate-limit requests. This prevents abuse of the upload and sign-in endpoints.",
         az: "Veb serverimizin giriş jurnalında qeydə alınır və yükləmə və giriş son nöqtələrindən sui-istifadənin qarşısını almaq üçün sorğuların tezliyinin məhdudlaşdırılmasında istifadə olunur.",
      },
      retention: {
         en: "The server keeps it for a short time. Standard log rotation then deletes it. We cannot delete single entries from that log on request.",
         az: "Adi sistem jurnalının fırlanma qaydaları ilə müəyyən edilən qısa müddət ərzində server jurnalında saxlanılır, sonra avtomatik silinir. Həmin jurnalın fərdi qeydlərini sorğu əsasında silə bilmirik.",
      },
   },
   {
      type: {
         en: "Browser User-Agent header",
         az: "Brauzerin User-Agent başlığı",
      },
      use: {
         en: "It is in our web server access log. We use it to find problems with page loading.",
         az: "Səhifələrin yüklənməsi ilə bağlı problemləri diaqnostika etmək üçün veb serverimizin giriş jurnalında qeydə alınır.",
      },
      retention: {
         en: "The same as the IP address.",
         az: "IP ünvanı ilə eyni müddətdə.",
      },
   },
   {
      type: {
         en: "Filename and description for an upload",
         az: "Yükləmə üçün təqdim etdiyiniz fayl adı və təsvir",
      },
      use: {
         en: "Sent to Wikimedia Commons to create the file page. This is the same as when you upload through the Commons website.",
         az: "Fayl səhifəsini yaratmaq üçün Wikimedia Commons-a göndərilir, yəni Commons veb-saytı vasitəsilə birbaşa yüklədiyiniz zaman olduğu kimi.",
      },
      retention: {
         en: "Kept permanently on Wikimedia Commons, which is a public project. Anyone can reuse or remove your upload under Commons policy.",
         az: "Wikimedia Commons-da həmişəlik qalır, çünki bu, açıq layihədir. Yükləməniz və təsviriniz açıq sənədin bir hissəsinə çevrilir və Commons siyasətlərinə uyğun olaraq yenidən istifadə edilə və ya silinə bilər.",
      },
   },
   {
      type: {
         en: "EXIF metadata, such as GPS coordinates and capture time",
         az: "Fotoşəkilinizdəki EXIF metadatası, o cümlədən GPS koordinatları və çəkiliş vaxtı",
      },
      use: {
         en: "We keep it because it makes the photo useful on Commons. It is published on Wikimedia Commons with the image.",
         az: "Silinmir, çünki bu məlumat fotoşəkili Commons-da faydalı edən əsas amillərdən biridir. Bu məlumat fotoşəkillə birlikdə Wikimedia Commons-da yayımlanır.",
      },
      retention: {
         en: "Kept permanently on Wikimedia Commons.",
         az: "Wikimedia Commons-da həmişəlik saxlanılır.",
      },
   },
] as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 3 — security measures (and §7.3.1 requirement 4)
// ---------------------------------------------------------------------------

export const PRIVACY_SECURITY_HEADING = {
   en: "How we protect your information",
   az: "Məlumatınızı necə qoruyuruq",
} as const;

export const PRIVACY_SECURITY = {
   intro: {
      en: "We take appropriate and reasonable measures to protect your Personal Information. These are the measures:",
      az: "Bu layihənin saxladığı Şəxsi Məlumatın təhlükəsizliyini qorumaq üçün müvafiq və lazımi tədbirlər görməyə çalışırıq. Praktikada bunlara aşağıdakılar daxildir:",
   },
   measures: [
      {
         en: "We never collect, store, or transmit your Wikimedia password. Wikimedia Commons checks it over OAuth.",
         az: "Vikipediya parolunuz bu layihə tərəfindən heç vaxt toplanmır, saxlanmır və ötürülmür. Kimliyin təsdiqi tamamilə OAuth vasitəsilə Wikimedia Commons-a həvalə olunur.",
      },
      {
         en: "We store the OAuth access token on the server only. We never send it to your browser. We never write it to a log.",
         az: "OAuth giriş tokeni yalnız server tərəfində saxlanılır. Heç vaxt brauzerinizə göndərilmir, heç bir API cavabına daxil edilmir və tətbiqin jurnalına heç vaxt yazılmır.",
      },
      {
         // `lax`, not `strict`: strict breaks the OAuth callback redirect, which is
         // a cross-site GET that must carry the session cookie. Lax blocks
         // cross-site writes, which is the CSRF-relevant case.
         en: "Session cookies are HttpOnly and Secure. SameSite=Lax blocks other sites from sending write requests as you.",
         az: "Sessiya çərəzləri HttpOnly və Secure atributları ilə işarələnir və SameSite ilə məhdudlaşdırılır ki, başqa veb-sayt sizin adınızdan sorğu göndərə bilməsin.",
      },
      {
         en: "We process uploaded photos in memory only. We never write them to disk or store them in a database. We send them to Commons, then discard them.",
         az: "Yüklənmiş fotoşəkillər yalnız serverin yaddaşında emal olunur. Onlar heç vaxt diskə yazılmır, bazamızda və ya keşimizdə saxlanmır; Commons-a ötürüldükdən sonra silinir.",
      },
      {
         en: "We rate-limit the sign-in and upload endpoints. We reject requests from other websites.",
         az: "Giriş və yükləmə son nöqtələrində sorğuların tezliyi məhdudlaşdırılır və digər veb-saytlardan gələn sorğular rədd edilir.",
      },
      {
         en: "We remove query strings from application logs. This keeps tokens and session identifiers out of log output.",
         az: "Sorğu sətirləri tətbiq qeydlərindən çıxarılır ki, tokenlər və ya sessiya identifikatorları jurnal çıxışında qeydə alınmasın.",
      },
      {
         en: "The site is HTTPS only. HSTS is on. A Content Security Policy restricts access.",
         az: "Sayt yalnız HTTPS vasitəsilə təqdim edilir, HSTS aktivdir və məzmun təhlükəsizliyi siyasəti ilə qorunur.",
      },
   ],
} as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 4 — who else can see it
// ---------------------------------------------------------------------------

export const PRIVACY_ACCESS_HEADING = {
   en: "Who else can access this information",
   az: "Bu informasiyaya kimlər daxil ola bilər",
} as const;

export const PRIVACY_ACCESS = {
   en: "The Wikimedia Foundation can see your Personal Information. Volunteer administrators of WMCS projects can see it. Other WMCS developers can see it. The administrators of this project can access the server database.",
   az: "Bu layihənin topladığı hər hansı Şəxsi Məlumat Vikimedia Fonduna, Wikimedia Cloud Services layihələrinin könüllü administratorlarına və digər Wikimedia Cloud Services tərtibatçılarına əlçatan ola bilər. Xüsusilə, bu layihənin administratorları saytı idarə etmək üçün serverin verilənlər bazasına daxil ola bilən könüllülərdir.",
} as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 5 — Wikimedia Usernames specifically
// ---------------------------------------------------------------------------

export const PRIVACY_USERNAMES_HEADING = {
   en: "About your Wikimedia username",
   az: "Vikipediya istifadəçi adınız haqqında",
} as const;

export const PRIVACY_USERNAMES = [
   {
      en: "When you sign in, we record your Wikimedia username. A username is Personal Information. It can help identify you when you combine it with other data. So we do not treat it as anonymous.",
      az: "Vikipediya hesabınızla daxil olmaq bu layihənin Vikipediya istifadəçi adınızı qeyd etməsi deməkdir. İstifadəçi adı Şəxsi Məlumatdır: digər məlumatlarla birləşdirildikdə şəxsinizi müəyyən etməyə kömək edə bilər və buna görə də biz onu anonim hesab etmirik.",
   },
   {
      en: "We use your username only to link your uploads to you and to show your profile page. We do not use it for advertising. We do not sell it. We do not share it with others for marketing.",
      az: "İstifadəçi adınızdan yalnız yüklədiyiniz fotoşəkilləri sizin adınızla əlaqələndirmək və profil səhifənizi göstərmək üçün istifadə edirik. Ondan reklam məqsədləri üçün istifadə etmirik və üçüncü tərəflərə marketinq məqsədilə satmırıq və ya ötürmürük.",
   },
   {
      en: "Sign out at any time to stop this. Signing out deletes the session from our server. You can also ask an administrator to delete data you think we should not keep.",
      az: "Çıxış etməklə bu prosesi istənilən vaxt dayandıra bilərsiniz; bu, sessiyanızı serverimizdən silir. Həmçinin saxlanılmamalı olduğunu düşündüyünüz hər hansı məlumatın silinməsini administratordan xahiş edə bilərsiniz.",
   },
] as const;

// ---------------------------------------------------------------------------
// §7.3.2 element 6 — administrators are bound by the admins' ToU
// ---------------------------------------------------------------------------

export const PRIVACY_ADMIN_HEADING = {
   en: "Governing terms",
   az: "Tətbiq olunan şərtlər",
} as const;

export const PRIVACY_ADMIN = {
   en: "The Wikimedia Cloud Services Terms of Use for Administrators and Developers govern our administrators. The Wikimedia Cloud Services Terms of Use for End Users govern your use of this project.",
   az: "Bu layihənin administratorları Wikimedia Cloud Services-in administratorlar və tərtibatçılar üçün nəzərdə tutulmuş Şərtlərinə tabedir. Bu layihə Wikimedia Cloud Services üzərində yerləşdirilib və ondan istifadəniz həmçinin Wikimedia Cloud Services-in son istifadəçiləri üçün nəzərdə tutulmuş Şərtlərlə tənzimlənir.",
} as const;

// ---------------------------------------------------------------------------
// §7.3.2 elements 7 and 8 — US hosting, cross-border transfers, disclaimer
// ---------------------------------------------------------------------------

export const PRIVACY_TRANSFER_HEADING = {
   en: "Where your information is processed",
   az: "Məlumatınızın emal olunduğu yer",
} as const;

/**
 * §7.3.2 element 7 — the US-hosting and cross-border notice.
 *
 * Deliberately short: the mandatory closing disclaimer (`PRIVACY_DISCLAIMER`)
 * already covers the same ground in the same order, and §7.3.2 element 8
 * requires that text verbatim. Repeating it in full here doubled the document
 * for no added disclosure, so this states the three required facts — processing
 * happens in the United States, information may go to other countries, and
 * those countries' laws may be weaker — and the disclaimer does the rest.
 */
export const PRIVACY_TRANSFER = {
   en: "WMCS is hosted and operated in the United States. We collect, store, and process your information there. Your information may also go to other countries. Those countries may have different or weaker data protection laws than your country.",
   az: "WMCS ABŞ-da yerləşir və idarə olunur. Wiki Loves Monuments Azerbaijan-dan istifadə etdikdə, bu Məxfilik Bəyannaməsində təsvir olunan məlumatlarınızın (şəxsi və ya digər) toplanmasının, istifadəsinin, saxlanmasının və digər emalının ABŞ-da həyata keçiriləcəyini qəbul edir və anlayırsınız. Məlumatlarınızın digər ölkələrə də ötürülə biləcəyini, ABŞ-ın və həmin digər ölkələrin ölkənizdəkilərdən fərqli və ya daha zəif məlumatların mühafizəsi qanunlarına malik ola biləcəyini anlayırsınız. Bundan əlavə, Şəxsi Məlumatınızın Vikimedia Fondunun Məxfilik Siyasəti ilə deyil, bu Məxfilik Bəyannaməsi ilə tənzimləndiyini qəbul edirsiniz.",
} as const;

/**
 * §7.3.2 element 8 — the closing disclaimer, which the Terms require to
 * contain at least the concepts in this text, and which additionally must
 * state that this Privacy Statement, not the WMF Privacy Policy, governs the
 * processing. Kept verbatim and unedited by design.
 */
export const PRIVACY_DISCLAIMER = {
   en: "WMCS is hosted and operated in the United States. By using Wiki Loves Monuments Azerbaijan, you acknowledge and understand that collection, use, storage, and other processing of your information (personal or otherwise) as outlined in this Privacy Statement will take place in the United States. You understand that your information also may be transferred to other countries, and that the United States and such other countries may have different or less stringent data protection laws than your country. Furthermore, you acknowledge that your Personal Information will be governed by this Privacy Statement, rather than the Wikimedia Foundation's Privacy Policy.",
   az: "WMCS ABŞ-da yerləşir və idarə olunur. Wiki Loves Monuments Azerbaijan-dan istifadə etdikdə, bu Məxfilik Bəyannaməsində təsvir olunan məlumatlarınızın (şəxsi və ya digər) toplanmasının, istifadəsinin, saxlanmasının və digər emalının ABŞ-da həyata keçiriləcəyini qəbul edir və anlayırsınız. Məlumatlarınızın digər ölkələrə də ötürülə biləcəyini, ABŞ-ın və həmin digər ölkələrin ölkənizdəkilərdən fərqli və ya daha zəif məlumatların mühafizəsi qanunlarına malik ola biləcəyini anlayırsınız. Bundan əlavə, Şəxsi Məlumatınızın Vikimedia Fondunun Məxfilik Siyasəti ilə deyil, bu Məxfilik Bəyannaməsi ilə tənzimləndiyini qəbul edirsiniz."
} as const;

/**
 * How to reach us — §7.3.2 allows (and this project prefers) an explicit route.
 *
 * Both strings end with the report address, so PrivacyPage.vue splits on
 * `PRIVACY_POLICY_LINKS.reportEmail` to render it as a `mailto:` link in place
 * rather than duplicating it in a second standalone anchor below the paragraph.
 */
export const PRIVACY_CONTACT = {
   heading: { en: "Questions or concerns", az: "Suallar və ya narahatlıqlar" },
   en: "If you think your Personal Information was exposed to a third party or the public, tell the project maintainers at once. You can also contact privacy@wikimedia.org.",
   az: "Əgər Şəxsi Məlumatınızın üçüncü tərəfə və ya ictimaiyyətə açıqlandığına inanırsınızsa, layihənin məsul şəxslərini dərhal xəbərdar edin və privacy@wikimedia.org ünvanı ilə əlaqə saxlayın.",
} as const;

/**
 * Link labels for the policy documents named in §7.3.2.
 *
 * Each label names the document it points at, so a reader can tell which
 * Terms they are being sent to; the parentheticals are what distinguishes the
 * two WMCS Terms documents from each other.
 */
export const PRIVACY_POLICY_LINK_LABELS = {
   adminTerms: {
      en: "Wikimedia Cloud Services Terms of Use for Administrators and Developers",
      az: "Wikimedia Cloud Services administratorlar və tərtibatçılar üçün Şərtlər",
   },
   endUserTerms: {
      en: "Wikimedia Cloud Services Terms of Use for End Users",
      az: "Wikimedia Cloud Services son istifadəçiləri üçün Şərtlər",
   },
   wmfPrivacy: {
      en: "Wikimedia Foundation Privacy Policy (not the document that governs your data here)",
      az: "Vikimedia Fondunun Məxfilik Siyasəti (müqayisə üçün; burada məlumatınızı tənzimləyən məhz bu bəyannamədir, həmin siyasət deyil)",
   },
} as const;

/**
 * The §7.3.2 element list this statement is built against. Exported so the
 * test can assert the mapping stays complete; each entry names the section
 * that requires it and a probe into the exported copy.
 */
export const PRIVACY_REQUIREMENTS = [
   { section: "§7.3.2", element: "document title", probe: (c: typeof PRIVACY_INTRO) => c.title.en },
   {
      section: "§7.3.2",
      element: "categories, uses, retention",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_DATA_TABLE.length,
   },
   {
      section: "§7.3.2",
      element: "security measures",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_SECURITY.measures.length,
   },
   {
      section: "§7.3.2",
      element: "WMF / volunteer admin / other developer access",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_ACCESS.en,
   },
   {
      section: "§7.3.2",
      element: "Wikimedia Usernames",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_USERNAMES.length,
   },
   {
      section: "§7.3.2",
      element: "administrators bound by the admins' ToU + link",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_ADMIN.en,
   },
   {
      section: "§7.3.2",
      element: "US hosting / cross-border disclosure",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_TRANSFER.en,
   },
   {
      section: "§7.3.2",
      element: "closing disclaimer (WPF, not WMCS)",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_DISCLAIMER.en,
   },
   {
      section: "§7.3.1",
      element: "conspicuous English homepage link target",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_POLICY_LINKS.home,
   },
   {
      section: "§9.1",
      element: "End User Terms of Use link",
      probe: (_c: typeof PRIVACY_INTRO) => PRIVACY_POLICY_LINKS.endUserTerms,
   },
] as const;
