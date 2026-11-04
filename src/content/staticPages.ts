/**
 * The static documents the site publishes.
 *
 * This is the single source of truth for their routes, output files, titles
 * and descriptions. The prerender, the post-build verifier, the HTML validator,
 * the Express static-page handler and the Vue page heads all consume it, so
 * adding or removing a page cannot leave one layer out of sync.
 *
 * The root (`/`) is included for consumers that validate or enumerate every
 * static document, but it is not written by the prerender: `dist/index.html`
 * stays the Vite SPA shell.
 *
 * Uses relative imports only so `tsx` can load it from `scripts/`.
 */

import { SITE_DESCRIPTION, SITE_HOST, SITE_TITLE } from "../utils/constants";
import { ABOUT_DESCRIPTION, ABOUT_TITLE } from "./about";

export interface StaticPage {
   /** Public route, without a trailing slash (except the root). */
   route: string;
   /** Absolute canonical URL, also used in the sitemap and og:url. */
   canonical: string;
   /** File name inside `dist/`. */
   file: string;
   /** Full `<title>` text, including the site-name suffix. */
   title: string;
   /** Meta description, also used for the social card. */
   description: string;
}

/** The unmodified Vite shell served at `/`. */
export const ROOT_PAGE: StaticPage = {
   route: "/",
   canonical: `${SITE_HOST}/`,
   file: "index.html",
   title: SITE_TITLE,
   description: SITE_DESCRIPTION,
};

/** Prerendered /stats page. */
export const STATS_PAGE: StaticPage = {
   route: "/stats",
   canonical: `${SITE_HOST}/stats`,
   file: "stats.html",
   title: `Statistika | ${SITE_TITLE}`,
   description:
      "Azərbaycanın tarixi abidələri haqqında statistika: abidə sayı, fotoşəkillər və əhatə dərəcəsi.",
};

/** Prerendered /leaderboard page. */
export const LEADERBOARD_PAGE: StaticPage = {
   route: "/leaderboard",
   canonical: `${SITE_HOST}/leaderboard`,
   file: "leaderboard.html",
   title: `Liderlik cədvəli | ${SITE_TITLE}`,
   description:
      "Viki Abidələri Sevir Azərbaycan müsabiqəsinin liderlik cədvəli. Ən çox şəkil yükləyən iştirakçılar.",
};

/** Prerendered /table page. */
export const TABLE_PAGE: StaticPage = {
   route: "/table",
   canonical: `${SITE_HOST}/table`,
   file: "table.html",
   title: `Abidələr siyahısı | ${SITE_TITLE}`,
   description:
      "Azərbaycanın bütün tarixi abidələrinin tam siyahısı: axtarın, çeşidləyin və şəkil yükləyin.",
};

/** Prerendered /about page. */
export const ABOUT_PAGE: StaticPage = {
   route: "/about",
   canonical: `${SITE_HOST}/about`,
   file: "about.html",
   title: ABOUT_TITLE,
   description: ABOUT_DESCRIPTION,
};

/** Prerendered pages, in the order they are written. */
export const STATIC_PAGES: readonly StaticPage[] = [
   STATS_PAGE,
   LEADERBOARD_PAGE,
   TABLE_PAGE,
   ABOUT_PAGE,
];

/** Every static document, root included. */
export const ALL_STATIC_PAGES: readonly StaticPage[] = [ROOT_PAGE, ...STATIC_PAGES];

/** Route → page lookup, e.g. for Express handlers and Vue page heads. */
export const STATIC_PAGE_BY_ROUTE: Readonly<Record<string, StaticPage>> = Object.fromEntries(
   ALL_STATIC_PAGES.map((page) => [page.route, page]),
);
