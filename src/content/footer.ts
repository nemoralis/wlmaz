/**
 * Footer-strip copy for the app shell (`src/App.vue`).
 *
 * Follows the XTools footer logic: the WMCS badge on the right links to the
 * Cloud VPS portal, and a muted credits line sits on the left. The legal links
 * that used to live here were removed by project decision, so nothing in this
 * module has to stay in step with the Privacy Statement copy.
 *
 * Uses relative imports only: like `about.ts`, the module must be loadable by
 * Vite (`@/…` alias) and by the prerender/verify scripts via `tsx`.
 */

import { ABOUT_REPO } from "./about.ts";

/**
 * The WMCS badge shown at the right of the footer strip (see src/App.vue).
 *
 * A verbatim copy of `Powered_by_Wikimedia_Cloud_Services.svg` from Wikimedia
 * Commons, kept in `public/` rather than hotlinked: the footer is on every page,
 * so it must not depend on a third-party request and has to survive offline and
 * in the PWA cache. Commons publishes the file as the badge for tools and
 * projects that declare they are powered by Wikimedia Cloud Services, which is
 * exactly what the footer says.
 *
 * `width`/`height` are the file's intrinsic size (1849.1942 × 652.42242) and
 * exist so the browser reserves the row before the SVG loads; the rendered
 * height comes from CSS. `alt` carries the Azerbaijani sentence the badge
 * replaced, because the badge's own wording is baked in as English paths.
 * `href` points at the Cloud VPS portal — the same target the XTools footer
 * wraps this badge in.
 */
export const FOOTER_WMCS_BADGE = {
   src: "/powered-by-wmcs.svg",
   width: 1849,
   height: 652,
   alt: "Wikimedia Cloud Services-də yerləşdirilib",
   href: "https://wikitech.wikimedia.org/wiki/Portal:Cloud_VPS",
} as const;

export const FOOTER_WIKIDATA_STAMP = {
   src: "/wikidata-stamp.svg",
   width: 899,
   height: 246,
   alt: "Wikidata-powered",
   href: "https://www.wikidata.org/",
} as const;

/**
 * The muted credits links on the left of the footer strip. The `©` that
 * precedes them is rendered by the shell from `ABOUT_COPYRIGHT_YEAR`.
 */
export const FOOTER_META_LINKS = [
   {
      label: "Haqqında",
      /** Internal route: rendered as a <router-link>, so it stays a client-side nav. */
      to: "/about",
      /** Renders a <router-link> rather than an off-site <a>. */
      external: false,
   },
   {
      label: ABOUT_REPO.label,
      /** External URL: rendered as an off-site <a>, like the old footer links. */
      to: ABOUT_REPO.href,
      external: true,
   },
] as const;
