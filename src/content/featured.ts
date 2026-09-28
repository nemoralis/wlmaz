/**
 * Resolves the landing-page hero data (featured collage + coverage counts)
 * from the monument geojson.
 *
 * Shared by `scripts/prerender.ts` (build time, fails the build on a bad
 * curated id) and `scripts/update-monuments.ts` (writes `public/home-data.json`,
 * which `Home.vue` fetches when it runs without a prerendered shell — i.e. in
 * `npm run dev`).
 *
 * Uses relative imports only: loaded by Vite, `tsx` scripts alike.
 */

import { encodeIdForUrl } from "../utils/monumentFormatters";

/** One monument promoted to the home page collage. */
export interface FeaturedMonument {
   /** Canonical (first) inventory id, as used by /monument/<id>. */
   inventory: string;
   label: string;
   parentLabel: string;
   /** Commons Special:FilePath URL, pre-optimised by the caller. */
   image: string;
   /** Canonical path of the monument's own page. */
   url: string;
}

/** Everything the landing page needs, injected as `#home-data` at build time. */
export interface HomeData {
   /** Ordered collage slots: first entry is the large hero image. */
   featured: FeaturedMonument[];
   /** Located (page-bearing) monuments — same rule as stats-history.json. */
   total: number;
   /** How many of those already have a photo. */
   withImage: number;
}

/**
 * Minimal structural shape of a geojson feature. Deliberately permissive so
 * every caller's own feature interface (the prerender script's, the update
 * script's, the shared types') is assignable to it without a cast.
 */
export interface HomeFeature {
   geometry: unknown;
   properties: {
      inventory?: unknown;
      itemLabel?: unknown;
      parentLabel?: unknown;
      image?: unknown;
   };
}

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Canonical inventory id (first comma-separated part). */
const canonicalId = (properties: HomeFeature["properties"]): string =>
   asString(properties.inventory).split(",")[0].trim();

/**
 * Builds the landing-page payload from the geojson.
 *
 * `strict` (build time) throws on a curated id that cannot be rendered —
 * missing feature, no coordinates, or no photo — so a bad edit can never ship.
 * Non-strict callers (the data update) skip the offending ids instead, since
 * the prerender is the authoritative gate and a design list must not block
 * daily data refreshes.
 */
export const resolveHomeData = (
   features: Iterable<HomeFeature>,
   ids: readonly string[],
   { strict = false }: { strict?: boolean } = {},
): HomeData => {
   const byId = new Map<string, HomeFeature>();
   let total = 0;
   let withImage = 0;

   for (const feature of features) {
      if (!feature.geometry) continue;
      total++;
      if (asString(feature.properties.image)) withImage++;

      const id = canonicalId(feature.properties);
      if (id && !byId.has(id)) byId.set(id, feature);
   }

   const featured: FeaturedMonument[] = [];
   for (const rawId of ids) {
      const id = asString(rawId);
      const feature = byId.get(id);

      if (!feature) {
         const message = `featured monument "${id}" not found among located features`;
         if (strict) throw new Error(message);
         console.warn(`home-data: ${message}`);
         continue;
      }

      const image = asString(feature.properties.image);
      if (!image) {
         const message = `featured monument "${id}" has no photo`;
         if (strict) throw new Error(message);
         console.warn(`home-data: ${message}`);
         continue;
      }

      featured.push({
         inventory: id,
         label: asString(feature.properties.itemLabel) || "Abidə",
         parentLabel: asString(feature.properties.parentLabel),
         // The geojson stores some Commons URLs over http; normalize once here
         // so no consumer can emit an insecure social-card/og:image URL.
         image: image.replace(/^http:/, "https:"),
         url: `/monument/${encodeIdForUrl(id)}`,
      });
   }

   return { featured, total, withImage };
};
