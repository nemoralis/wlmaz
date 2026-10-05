/**
 * About-page copy.
 *
 * Single source of truth for the wording rendered by `src/pages/About.vue` and
 * for the head tags `scripts/prerender.ts` writes into `dist/about.html`, so
 * the Vue page and the shipped document cannot disagree on title/description.
 *
 * Uses relative imports only: the module is loaded both by Vite (`@/…` alias)
 * and by the prerender/verify scripts via `tsx`, which resolve `../src/...`.
 */

import { SITE_HOST } from "../utils/constants";

/**
 * `<title>` for /about.
 *
 * Mirrors the `${pageTitle} | ${SITE_TITLE}` string scripts/prerender.ts
 * builds for every static page, so the title in the prerendered document and
 * the one the runtime head sets are byte-identical and nothing swaps on mount.
 */
export const ABOUT_TITLE = "Haqqında | Viki Abidələri Sevir Azərbaycan";

export const ABOUT_CANONICAL = `${SITE_HOST}/about`;

/**
 * Social card image. The site logo, matching what scripts/prerender.ts writes
 * for every static page — the about page has no hero photo to reuse.
 */
export const ABOUT_SOCIAL_IMAGE = `${SITE_HOST}/wlm-az.png`;

/**
 * Meta description for /about. Deliberately free of monument counts — the
 * numbers on the page come from the build-time payload, so they stay accurate
 * without a second edit here (same rule as HOME_DESCRIPTION).
 */
export const ABOUT_DESCRIPTION =
   "Azərbaycanın tarixi abidələri üçün açıq xəritə, siyahı və statistika: " +
   "Wikidata məlumatları, xəritə qatları, fotoşəkil lisenziyaları və " +
   "Wikimedia Commons-a birbaşa yükləmək imkanı.";

/** Mirrors the breadcrumb JSON-LD emitted by About.vue. */
export const ABOUT_BREADCRUMB = [
   { name: "Ana Səhifə", url: `${SITE_HOST}/` },
   { name: "Haqqında", url: ABOUT_CANONICAL },
] as const;

export const ABOUT_HEADLINE = "Layihə haqqında";

export const ABOUT_LEAD =
   "wikilovesmonuments.az Azərbaycanın mədəni irs abidələrini bir xəritədə birləşdirir və " +
   "onların fotoşəkillərini Wikimedia Commons-a yükləməyə kömək edir. ";
export const ABOUT_PRIMARY_CTA = { label: "Xəritəyə bax", to: "/map" };

export const ABOUT_SECONDARY_CTA = { label: "Statistika", to: "/stats" };

/**
 * The campaign logo shown beside the hero heading.
 *
 * A verbatim copy of `WLM_az.svg` from Wikimedia Commons, kept in `public/`
 * (like the site's own `wlm-az.svg`) rather than hotlinked: the hero must not
 * depend on a third-party request, and the CSP's `img-src` already allows
 * `*.wikimedia.org`, so either works — self-hosting is the one that keeps
 * working offline and in the PWA cache. Unmodified, so the credit below is the
 * whole attribution the CC BY-SA 3.0 licence requires.
 *
 * Portrait (350 × 407), unlike the horizontal `wlm-az.svg` wordmark the header
 * uses — hence the right-hand hero column rather than an inline badge.
 */
export const ABOUT_LOGO = {
   src: "/wlm-az-logo.svg",
   /** Intrinsic size, so the browser reserves the box before the SVG loads. */
   width: 350,
   height: 407,
   alt: "Wiki Loves Monuments Azərbaycan logosu",
   /** Canonical file page — required as the attribution target. */
   href: "https://commons.wikimedia.org/wiki/File:WLM_az.svg",
   author: "Interfase",
   license: "CC BY-SA 3.0",
   licenseHref: "https://creativecommons.org/licenses/by-sa/3.0/",
} as const;

/**
 * Attribution line for the logo, rendered in the license section rather than
 * under the image: the hero stays frameless, but CC BY-SA 3.0 still requires a
 * credit and a link to the licence, and this is where the page keeps that kind
 * of information.
 */
export const ABOUT_LOGO_CREDIT = `${ABOUT_LOGO.author}, ${ABOUT_LOGO.license}`;

/** Labels for the hero count strip. Values are formatted at render time. */
export const ABOUT_COUNTS = {
   total: "abidə",
   withImage: "şəkli var",
   withoutImage: "şəkli yoxdur",
} as const;

export const ABOUT_WLM_HEADING = "Viki Abidələri Sevir nədir?";

/**
 * Two paragraphs: what the international contest is, and what this site adds
 * on top of it. The second paragraph replaces the old page's vaguer claim that
 * the map exists "to help volunteers" with the concrete tooling.
 */
export const ABOUT_WLM_BODY = [
   "Viki Abidələri Sevir hər il sentyabr ayında Vikimedia icması tərəfindən keçirilən " +
      "beynəlxalq fotoşəkil müsabiqəsidir. Müsabiqənin məqsədi ölkələrin mədəni irs " +
      "abidələrinin fotoşəkillərini toplayıb onları Wikimedia Commons-da sərbəst " +
      "istifadəyə verməkdir.",
   "Azərbaycanda bu işlə məşğul olan könüllülər üçün sayt tapşırığı sadələşdirir: abidəni " +
      "tapmaq, fotoşəklini çəkmək və yükləmək üçün alətlər bir yerdə toplanır.",
] as const;

export const ABOUT_FEATURES_HEADING = "Bu sayt nə edir?";

export const ABOUT_FEATURES_INTRO =
   "Bütün iştirak yolu bir neçə səhifədə toplanır — xəritədən tutmuş reytinqə qədər.";

/**
 * The site's own capabilities, one card each. `icon` selects an inline SVG
 * path in About.vue (never a FontAwesome component): the map page's markers
 * and buttons use FA, but this page keeps to the landing page's hand-rolled
 * icons so the markup stays predictable.
 */
export const ABOUT_FEATURES = [
   {
      icon: "map",
      title: "Xəritə",
      to: "/map",
      cta: "Xəritəni aç",
      body: "Abidələr rayonlar üzrə xəritədə göstərilir.",
   },
   {
      icon: "table",
      title: "Abidələr siyahısı",
      to: "/table",
      cta: "Siyahını aç",
      body: "Tam siyahı: inventar nömrəsi, rayon və abidənin şəklinin " + "olub-olmaması.",
   },
   {
      icon: "chart",
      title: "Statistika",
      to: "/stats",
      cta: "Statistikanı aç",
      body:
         "Ümumi abidə sayı, fotoşəkilli və fotoşəkilsiz abidələrin bölgüsü, " +
         " illik dinamika və son yenilənmə tarixi.",
   },
   {
      icon: "trophy",
      title: "İştirakçılar",
      to: "/leaderboard",
      cta: "Reytinqə bax",
      body: "Ən çox fotoşəkil yükləyən istifadəçilərin reytinqi və yükləmə " + "sayları.",
   },
   {
      icon: "upload",
      title: "Şəkil yükləmə",
      to: "/map",
      cta: "Yükləməyə başla",
      body:
         "Vikimedia hesabı ilə daxil olun və fotoşəkli xəritədən və ya abidənin " +
         "öz səhifəsindən birbaşa Commons-a yükləyin.",
   },
] as const;

export const ABOUT_DATA_HEADING = "Məlumat mənbəsi";

export const ABOUT_DATA_BODY = [
   "Abidələrin adları, rayonları, inventar nömrələri və mövcud fotoşəkillər Vikidatadan götürülür.",
   "Xəritə olaraq OpenStreetMap, Google Maps və Gomap.az istifadə olunur ",
] as const;

export const ABOUT_DATA_NOTE =
   "Məlumatın son yenilənmə tarixini statistika səhifəsində görə bilərsiniz.";

export const ABOUT_DATA_CTA = { label: "Statistikanı aç", to: "/stats" };

export const ABOUT_LICENSES_HEADING = "Lisenziya";

export const ABOUT_LICENSES_INTRO =
   "Yüklədiyiniz fotoşəkillər Wikimedia Commons-da sərbəst lisenziya altında yayımlanır və " +
   "hər kəs tərəfindən istifadə oluna bilər.";

/**
 * The three licenses the upload form offers (`src/utils/sanitize.ts` maps
 * anything unknown to cc-by-sa-4.0, so the default must be listed first).
 */
export const ABOUT_LICENSES = [
   {
      label: "CC BY-SA 4.0",
      href: "https://creativecommons.org/licenses/by-sa/4.0/deed.az",
      note: "Standart seçim. Təkrar istifadədə fotoşəkilin olduğu kimi paylaşılması şərti qoyulur.",
   },
   {
      label: "CC BY 4.0",
      href: "https://creativecommons.org/licenses/by/4.0/deed.az",
      note: "Təkrar istifadədə müəllifin adını göstərmək kifətdir.",
   },
   {
      label: "CC0",
      href: "https://creativecommons.org/publicdomain/zero/1.0/deed.az",
      note: "İstifadəyə heç bir məhdudiyyət qoymur.",
   },
] as const;

export const ABOUT_LICENSES_FOOTER =
   "Saytın mənbə kodu MIT lisenziyası ilə, abidə məlumatları isə Wikidatada CC0 " +
   "lisenziyası ilə yayımlanır.";

export const ABOUT_AUTHOR = { name: "Nəriman", href: "https://neriman.me" };

export const ABOUT_REPO = {
   label: "Mənbə kodu",
   href: "https://gitlab.wikimedia.org/nmw03/wlmaz",
} as const;

/**
 * Hard-coded rather than read from the clock: the year is a fact about the
 * footer copy, and a build-time constant keeps the prerendered document and
 * the Vue render identical. Bump it with the next yearly content pass.
 */
export const ABOUT_COPYRIGHT_YEAR = 2026;
