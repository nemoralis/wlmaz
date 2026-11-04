/**
 * Coverage counts shown in the /about hero.
 *
 * Only located monuments (those with geometry) are counted, matching the rule
 * `public/stats-history.json` and the /stats page use. The counts are resolved
 * at build time by `scripts/prerender.ts` and inlined into `about.html`; the
 * client falls back to the latest stats-history entry when that payload is
 * absent (client-side navigation or `npm run dev`).
 *
 * Uses relative imports only where needed: the module is loaded both by Vite
 * (`@/…` alias) and by the prerender script via `tsx`.
 */

/** How much of the located monument set already has a photo. */
export interface CoverageData {
   /** Located monuments — same rule as stats-history.json. */
   total: number;
   /** How many of those already have a photo. */
   withImage: number;
}

/**
 * Minimal structural shape of a geojson feature. Deliberately permissive so
 * every caller's own feature interface is assignable without a cast.
 */
export interface CoverageFeature {
   geometry: unknown;
   properties: {
      image?: unknown;
   };
}

/** Resolves the coverage counts from the monument geojson. */
export const resolveCoverage = (features: Iterable<CoverageFeature>): CoverageData => {
   let total = 0;
   let withImage = 0;

   for (const feature of features) {
      if (!feature.geometry) continue;
      total++;
      if (feature.properties.image) withImage++;
   }

   return { total, withImage };
};
