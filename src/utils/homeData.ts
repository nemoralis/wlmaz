/**
 * Reader for the build-time `#home-data` payload.
 *
 * `scripts/prerender.ts` inlines the payload into the pages that show coverage
 * counts (`/` and `/about`) so the first Vue render already matches the markup
 * that ships inside `#app` — no flash, no request. `public/home-data.json` is
 * the same payload for `npm run dev` and as the fallback when a page is served
 * without the inlined copy.
 *
 * The parsing step is kept separate from the DOM lookup so it stays unit
 * testable: the test suite runs in the `node` environment (vitest.config.ts)
 * and has no `document`.
 */

import type { HomeData } from "@/content/featured.ts";

/** Id of the JSON payload script the prerender writes into the document head. */
export const HOME_DATA_ELEMENT_ID = "home-data";

/** Path of the snapshot written to `public/` by `npm run update-data`. */
export const HOME_DATA_URL = "/home-data.json";

/**
 * Parses a `#home-data` payload.
 *
 * Returns `null` for missing or malformed input rather than throwing: the
 * counts are supplementary, so a broken payload must degrade to "no numbers"
 * instead of taking the page down with it.
 */
export const parseHomeData = (json: string | null | undefined): HomeData | null => {
   if (!json) return null;

   try {
      const parsed = JSON.parse(json) as Partial<HomeData> | null;
      if (!parsed || typeof parsed !== "object") return null;

      // Only the counts are consumed outside the landing page, but validating
      // them here keeps a truncated payload from rendering "NaN" or "0".
      if (typeof parsed.total !== "number" || typeof parsed.withImage !== "number") return null;

      return {
         featured: parsed.featured ?? [],
         regions: parsed.regions ?? [],
         total: parsed.total,
         withImage: parsed.withImage,
      };
   } catch (e) {
      console.warn("Failed to parse #home-data", e);
      return null;
   }
};

/** Reads the payload the prerender inlined into the document, if present. */
export const readEmbeddedHomeData = (): HomeData | null => {
   const el = document.getElementById(HOME_DATA_ELEMENT_ID);
   return parseHomeData(el?.textContent);
};

/**
 * Fetches the snapshot for documents without an inlined payload. Kept as a
 * separate step so callers can render synchronously first and only reach for
 * the network when the embedded copy was missing.
 */
export const fetchHomeData = async (): Promise<HomeData | null> => {
   try {
      const res = await fetch(HOME_DATA_URL);
      if (!res.ok) return null;
      return parseHomeData(await res.text());
   } catch (e) {
      console.warn(`Failed to load ${HOME_DATA_URL}`, e);
      return null;
   }
};
