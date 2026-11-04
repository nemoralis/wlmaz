/**
 * Reader for the build-time `#coverage-data` payload.
 *
 * `scripts/prerender.ts` inlines only the two coverage counts into `/about` so
 * the first Vue render already matches the shipped markup — no flash, no
 * request. Everywhere else (client-side navigation or `npm run dev`) the page
 * falls back to the latest entry in `public/stats-history.json`.
 *
 * The parsing step is kept separate from the DOM lookup so it stays unit
 * testable: the test suite runs in the `node` environment (vitest.config.ts)
 * and has no `document`.
 */

import type { CoverageData } from "../content/coverage.ts";

/** Id of the JSON payload script the prerender writes into the document head. */
export const COVERAGE_DATA_ELEMENT_ID = "coverage-data";

/** The public history file whose last entry is the fallback count source. */
export const STATS_HISTORY_URL = "/stats-history.json";

/**
 * Parses a `#coverage-data` payload.
 *
 * Returns `null` for missing or malformed input rather than throwing: the
 * counts are supplementary, so a broken payload must degrade to "no numbers"
 * instead of taking the page down with it.
 */
export const parseCoverageData = (json: string | null | undefined): CoverageData | null => {
   if (!json) return null;

   try {
      const parsed = JSON.parse(json) as Partial<CoverageData> | null;
      if (!parsed || typeof parsed !== "object") return null;

      if (typeof parsed.total !== "number" || typeof parsed.withImage !== "number") return null;

      return { total: parsed.total, withImage: parsed.withImage };
   } catch (e) {
      console.warn("Failed to parse coverage data", e);
      return null;
   }
};

/** Reads the payload the prerender inlined into the document, if present. */
export const readEmbeddedCoverage = (): CoverageData | null => {
   const el = document.getElementById(COVERAGE_DATA_ELEMENT_ID);
   return parseCoverageData(el?.textContent);
};

/**
 * Fetches the latest coverage counts from stats-history.json. Kept as a
 * separate step so callers can render synchronously first and only reach for
 * the network when the embedded copy was missing.
 */
export const fetchCoverage = async (): Promise<CoverageData | null> => {
   try {
      const res = await fetch(STATS_HISTORY_URL);
      if (!res.ok) return null;

      const history = (await res.json()) as unknown;
      if (!Array.isArray(history) || history.length === 0) return null;

      return parseCoverageData(JSON.stringify(history[history.length - 1]));
   } catch (e) {
      console.warn(`Failed to load ${STATS_HISTORY_URL}`, e);
      return null;
   }
};
