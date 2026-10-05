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

/** One region (district) promoted to the landing-page region grid. */
export interface FeaturedRegion {
   /** parentLabel, e.g. "Səbail rayonu". */
   label: string;
   /** How many located monuments the region has. */
   count: number;
   /** How many of those already have a photo. */
   withImage: number;
}

/** Everything the landing page needs, injected as `#home-data` at build time. */
export interface HomeData {
   /** Ordered collage slots: first entry is the large hero image. */
   featured: FeaturedMonument[];
   /** Located (page-bearing) monuments — same rule as stats-history.json. */
   total: number;
   /** How many of those already have a photo. */
   withImage: number;
   /** Busiest regions, most monuments first. */
   regions: FeaturedRegion[];
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

/** How many regions the landing-page grid shows. */
export const DEFAULT_REGION_LIMIT = 12;

/** Canonical inventory id (first comma-separated part). Handles both strings and arrays. */
const canonicalId = (properties: HomeFeature["properties"]): string => {
   const raw = properties.inventory;
   const first = Array.isArray(raw) ? (raw[0] as unknown) : raw;
   return asString(first).split(",")[0].trim();
};

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
   {
      strict = false,
      regionLimit = DEFAULT_REGION_LIMIT,
   }: { strict?: boolean; regionLimit?: number } = {},
): HomeData => {
   const byId = new Map<string, HomeFeature>();
   const regionTotals = new Map<string, { count: number; withImage: number }>();
   let total = 0;
   let withImage = 0;

   for (const feature of features) {
      if (!feature.geometry) continue;
      total++;

      const region = asString(feature.properties.parentLabel);
      if (region) {
         const bucket = regionTotals.get(region) ?? { count: 0, withImage: 0 };
         bucket.count++;
         if (asString(feature.properties.image)) bucket.withImage++;
         regionTotals.set(region, bucket);
      }

      if (asString(feature.properties.image)) withImage++;

      const id = canonicalId(feature.properties);
      if (id && !byId.has(id)) byId.set(id, feature);
   }

   // Busiest regions first; ties broken alphabetically so the landing page is
   // byte-stable across rebuilds when two regions hold the same count.
   const regions: FeaturedRegion[] = [...regionTotals.entries()]
      .map(([label, bucket]) => ({ label, count: bucket.count, withImage: bucket.withImage }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "az"))
      .slice(0, regionLimit);

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

   return { featured, total, withImage, regions };
};
