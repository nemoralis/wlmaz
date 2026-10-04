/**
 * Landing-page copy and campaign gating.
 *
 * Single source of truth for the wording rendered by `src/pages/Home.vue`
 * (what visitors see) and `scripts/prerender.ts` (what crawlers get in the
 * very first response), so the two copies of the page cannot drift apart.
 *
 * Uses relative imports only: the module is loaded both by Vite (`@/…` alias)
 * and by the prerender/verify scripts via `tsx`, which resolve `../src/...`.
 */

import { SITE_HOST } from "../utils/constants";

/** The home page carries the site name as its <title> (verify-prerender allows it). */
export const HOME_TITLE = "Viki Abidələri Sevir Azərbaycan";

export const HOME_CANONICAL = `${SITE_HOST}/`;

/**
 * Meta description for `/`. Deliberately free of hard-coded counts — the
 * visible numbers on the page come from the build-time geojson, so they stay
 * accurate without a second edit here.
 */
export const HOME_DESCRIPTION =
   "Viki Abidələri Sevir Azərbaycan — Azərbaycanın tarixi abidələri və mədəni irs xəritəsi. " +
   "Abidəni xəritədə tapın, pulsuz şəkil çəkin və Wikimedia Commons-a yükləyin.";

export const HOME_HEADLINE = "Azərbaycanın mədəni irsini sənədləşdiririk";

export const HOME_INTRO =
   "Viki Abidələri Sevir dünyanın ən böyük fotoşəkil müsabiqəsidir. Çəkdiyiniz hər şəkil " +
   "Wikimedia Commons-a yükləndikdə mədəni irsimiz əlçatan, pulsuz və dünya miqyasında görünür.";

export const HOME_PRIMARY_CTA = { label: "Xəritəyə bax", to: "/map" };

export const HOME_SECONDARY_CTA = { label: "Daha çox məlumat", to: "/about" };

/** Heading above the how-to-participate steps. */
export const HOME_STEPS_HEADING = "Necə iştirak etməli?";

/** Sub-heading under HOME_STEPS_HEADING. */
export const HOME_STEPS_INTRO =
   "Üç addım. Müraciət tələb olunmur — telefon və ya kamera və Wikimedia hesabı kifayətdir.";

/**
 * The three participation steps.
 *
 * Copy only. The step icons are inline `<svg>` in both render paths rather than
 * FontAwesome components, because `scripts/prerender.ts` emits hand-written HTML
 * and cannot reproduce the markup the FA component generates.
 */
export const HOME_STEPS = [
   {
      title: "Abidəni seçin",
      body: "Xəritədə yaxınınızdakı abidəni tapın və inventar nömrəsini qeyd edin.",
   },
   {
      title: "Şəkil çəkin",
      body: "Abidənin tam və aydın şəklini çəkin; nəşqləri və ornamentlərin yaxın planını da əlavə edin.",
   },
   {
      title: "Commons-a yükləyin",
      body: "Wikimedia hesabınızla daxil olun və şəkli CC BY-SA lisenziyası ilə Wikimedia Commons-a yükləyin.",
   },
] as const;

/**
 * Contest callout. Auto-hides once the contest is over, mirroring the
 * reference site's own campaign banner. UTC so the prerender (node) and the
 * browser agree on the boundary; the banner is purely informational, so a
 * few hours of timezone skew is harmless either way.
 */
export const CAMPAIGN = {
   title: "Wiki Loves Monuments 2026",
   body: "Müsabiqə 1–30 sentyabr tarixlərində keçirilir. Şəkilləri yükləmək üçün müsabiqə səhifəsinə baxın.",
   cta: "Müsabiqə səhifəsi",
   href: "https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2026_in_Azerbaijan",
   /**
    * Campaign banner disappears on this instant (2026-10-01T00:00:00Z), i.e. the
    * close of the 1–30 September contest. Months are zero-indexed, so `9` is
    * October. For the next edition update title/body/href/endsAt together so the
    * banner never advertises a contest that is not running.
    */
   endsAt: new Date(Date.UTC(2026, 9, 1)),
} as const;

/** Whether the campaign banner should be shown at the given moment. */
export const isCampaignActive = (now: Date = new Date()): boolean =>
   now.getTime() < CAMPAIGN.endsAt.getTime();

/**
 * Formats a count with an Azerbaijani thousands separator (space).
 *
 * Deliberately not `Intl.NumberFormat("az-AZ")`: node and the browser must
 * produce byte-identical markup for the prerendered page and its Vue
 * counterpart, and node builds vary in which locales they ship.
 */
export const formatMonumentCount = (count: number): string =>
   String(count).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
