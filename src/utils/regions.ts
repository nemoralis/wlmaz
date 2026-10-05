/**
 * Region helpers for the `/regions` map and the `/region/<name>` pages.
 *
 * Single source of truth for two things that must never drift apart:
 *
 * 1. Which region a monument belongs to — a strict equality test on
 *    `properties.parentLabel` against the region's own name. Nothing else is
 *    consulted. No coordinates, no address, no `P131`, no inventory number.
 *    A monument with an empty or unmatched `parentLabel` therefore belongs to
 *    no region at all and appears on no region page.
 * 2. How a region name becomes a URL — `regionPath`, used by both the SVG map
 *    and any other link, so there is no second name-to-URL table.
 *
 * Also owns the geojson -> SVG path conversion, which runs at build time in
 * `scripts/write-regions-map.ts` and writes `public/regions-map.json`. The
 * source `data/regions.geojson` is read-only and is never rewritten.
 */

import type { MonumentProps } from "@/types";
import { getCanonicalId } from "./monumentFormatters";

/** Property holding the native (Azerbaijani) region name in regions.geojson. */
export const REGION_NAME_PROPERTY = "Name_AZ";

/** Where the generated map payload lives, mirroring `public/home-data.json`. */
export const REGIONS_MAP_URL = "/regions-map.json";

/**
 * Folds a `parentLabel` to its region key.
 *
 * The boundaries are region-level ("Şəki") while `parentLabel` is
 * district-level ("Şəki rayonu"), so the trailing Azerbaijani word for
 * "district" is dropped before comparing. 5130 of the 7196 monuments carry
 * the suffix and 55 regions are spelled both ways, so without this fold the
 * comparison matches 735 monuments instead of 5865 and 25 regions look empty
 * for the wrong reason.
 *
 * This is a pure read-time comparison key. `parentLabel` itself is never
 * written, normalised in place, or repaired — the values in
 * `data/monuments.geojson` stay exactly as they are.
 *
 * Only the suffix is removed. No fuzzy, prefix, or substring matching happens
 * here, so "Bakı" still matches no region rather than being spread across the
 * twelve Baku districts in the boundary file.
 */
export const regionKey = (label: string | null | undefined): string =>
   (label ?? "")
      .trim()
      .replace(/\s+rayonu$/i, "")
      .trim();

/** Canonical path of a region's own page. Encodes non-ASCII names. */
export const regionPath = (name: string): string => `/region/${encodeURIComponent(name)}`;

/** The monuments whose `parentLabel` belongs to `name`. Never invents membership. */
export const monumentsInRegion = (monuments: MonumentProps[], name: string): MonumentProps[] => {
   const key = regionKey(name);
   if (!key) return [];
   return monuments.filter((monument) => regionKey(monument.parentLabel) === key);
};

/**
 * Photo coverage for one region, plus the monuments that have a photograph.
 *
 * The denominator is *every* monument the region matches, not just the ones with
 * a page of their own. That is deliberate and differs from the site-wide counts
 * on `/` and `/about`, which count only located monuments: here it keeps the
 * stats describing the same number the page's own heading and table already show.
 * The two are therefore not expected to agree, and neither is a bug.
 *
 * Returns `null` for a region with no monuments at all, so callers can tell
 * "nothing recorded" apart from "recorded but nothing photographed" — 21 of the
 * 84 populated regions have monuments and no photographs, and those are a real
 * 0%, not an absence of data.
 */
export interface RegionPhotoStats {
   /** Monuments the region matches, by `parentLabel`. */
   total: number;
   /** How many of those have an `image`. */
   withPhoto: number;
   /** `total - withPhoto`. Never negative. */
   withoutPhoto: number;
   /** `withPhoto / total` as a percentage, to one decimal like `Home.vue`. */
   percent: number;
   /** The photographed monuments, ordered so the gallery is stable across loads. */
   photos: MonumentProps[];
}

/**
 * Computes a region's photo coverage.
 *
 * Returns `null` when the region matches nothing, so an empty region renders the
 * page's existing empty state rather than a set of zeros.
 */
export const regionPhotoStats = (
   monuments: MonumentProps[],
   name: string,
): RegionPhotoStats | null => {
   const inRegion = monumentsInRegion(monuments, name);
   if (inRegion.length === 0) return null;

   const photos = inRegion
      .filter((monument) => typeof monument.image === "string" && monument.image.trim() !== "")
      .sort((a, b) =>
         getCanonicalId(a.inventory).localeCompare(getCanonicalId(b.inventory), "az", {
            numeric: true,
         }),
      );

   const total = inRegion.length;
   const withPhoto = photos.length;

   return {
      total,
      withPhoto,
      withoutPhoto: Math.max(0, total - withPhoto),
      // Rounded to one decimal so the value cannot differ between renders.
      percent: Math.round((withPhoto / total) * 1000) / 10,
      photos,
   };
};

/** One region as the map needs it: its canonical name and its SVG path. */
export interface RegionShape {
   /** `Name_AZ`, the canonical region name used in URLs. */
   name: string;
   /** Path data in the map's own user units. Polygon and MultiPolygon both. */
   path: string;
}

/** Everything `RegionsMap.vue` needs to draw the map. */
export interface RegionsMapData {
   /** viewBox for the outer <svg>, e.g. "0 0 1000 1000". */
   viewBox: string;
   regions: RegionShape[];
}

/** Structural shape of a regions.geojson feature, as this module reads it. */
export interface RegionFeature {
   geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][][] | number[][][];
   } | null;
   properties: Record<string, unknown>;
}

/**
 * Parses the generated map payload, returning `null` rather than throwing on
 * malformed input: a broken map must degrade to an empty map, not take the
 * page down. Mirrors `parseHomeData` in `utils/homeData.ts`.
 */
export const parseRegionsMap = (json: string | null | undefined): RegionsMapData | null => {
   if (!json) return null;

   try {
      const parsed = JSON.parse(json) as Partial<RegionsMapData> | null;
      if (!parsed || typeof parsed !== "object") return null;
      if (typeof parsed.viewBox !== "string" || !Array.isArray(parsed.regions)) return null;

      const regions = parsed.regions.filter(
         (region): region is RegionShape =>
            !!region &&
            typeof region.name === "string" &&
            region.name.length > 0 &&
            typeof region.path === "string" &&
            region.path.length > 0,
      );

      return { viewBox: parsed.viewBox, regions };
   } catch (e) {
      console.warn("Failed to parse regions map payload", e);
      return null;
   }
};

/** Options for `buildRegionsMap`. */
export interface BuildRegionsMapOptions {
   /** Output width/height in user units. */
   size?: number;
   /**
    * Douglas-Peucker tolerance in user units. The raw geometry is ~2.9 MB of
    * path data, which is far too much to ship; at the default the payload is
    * ~150 KB and still reads as a clean outline at map sizes.
    */
   tolerance?: number;
}

/**
 * Converts region features into an SVG map payload.
 *
 * Handles Polygon and MultiPolygon through one code path: a Polygon's rings
 * are treated as a single-element MultiPolygon, so the ring walk below never
 * branches on geometry type. Holes are preserved as inner rings with
 * `fill-rule="evenodd"` on the consuming <path>.
 */
export const buildRegionsMap = (
   features: RegionFeature[],
   { size = 1000, tolerance = 0.3 }: BuildRegionsMapOptions = {},
): RegionsMapData => {
   const rings: { name: string; ring: number[][] }[] = [];

   for (const feature of features) {
      const name = feature.properties?.[REGION_NAME_PROPERTY];
      if (!feature.geometry || typeof name !== "string" || !name) continue;

      // One shape per ring: a hole is drawn with its own fill-rule, so the
      // map needs no geometry-type special cases at render time.
      const polygons: number[][][][] =
         feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates as number[][][]]
            : (feature.geometry.coordinates as number[][][][]);

      for (const polygon of polygons) {
         for (const ring of polygon) {
            if (Array.isArray(ring) && ring.length > 0) rings.push({ name, ring });
         }
      }
   }

   if (rings.length === 0) {
      return { viewBox: `0 0 ${size} ${size}`, regions: [] };
   }

   const bounds = boundsOf(rings.flatMap(({ ring }) => ring));

   // Longitude degrees are narrower than latitude degrees away from the
   // equator. Without this cos correction the whole country is stretched
   // ~32% vertically: Azerbaijan's true shape is 1.32x wider than tall, not
   // square. Equirectangular about the data's own mid-latitude, which is what
   // the 10 MB source bounds justify at this extent.
   const midLat = ((bounds.minY + bounds.maxY) / 2) * (Math.PI / 180);
   const lonScale = Math.cos(midLat) || 1;

   const lonSpan = (bounds.maxX - bounds.minX) * lonScale || 1;
   const latSpan = bounds.maxY - bounds.minY || 1;

   // viewBox follows the real aspect so `preserveAspectRatio` never has to
   // correct a distortion. Both axes are scaled to fill it exactly, so no
   // path can land outside the viewBox.
   const height = Math.round((size * latSpan) / lonSpan);
   const scaleX = size / lonSpan;
   const scaleY = height / latSpan;

   /** lon/lat -> user units. Latitude is flipped so north is up. */
   const project = ([lon, lat]: number[]): [number, number] => [
      (lon - bounds.minX) * lonScale * scaleX,
      (bounds.maxY - lat) * scaleY,
   ];

   // A MultiPolygon contributes several rings under one name. They are
   // concatenated into a single path (one closed subpath each) so the map
   // keeps one entry per region and one hover target per region, and so
   // holes still read as holes under `fill-rule="evenodd"`.
   const byName = new Map<string, string[]>();
   for (const { name, ring } of rings) {
      const points = ring.map(project);
      const simplified = tolerance > 0 ? simplify(points, tolerance) : points;

      // A ring that collapses below a triangle has no area to fill; drawing it
      // would add a stray path with a visible point marker on hover.
      if (simplified.length < 3) continue;

      let path = "";
      simplified.forEach(([x, y], index) => {
         path += `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
      });
      path += "Z";

      const existing = byName.get(name);
      if (existing) existing.push(path);
      else byName.set(name, [path]);
   }

   const regions: RegionShape[] = [...byName].map(([name, paths]) => ({
      name,
      path: paths.join(""),
   }));

   return { viewBox: `0 0 ${size} ${height}`, regions };
};

/** Longest/latitude extents of a flat coordinate list. */
const boundsOf = (coordinates: number[][]) =>
   coordinates.reduce(
      (bounds, [lon, lat]) => ({
         minX: Math.min(bounds.minX, lon),
         minY: Math.min(bounds.minY, lat),
         maxX: Math.max(bounds.maxX, lon),
         maxY: Math.max(bounds.maxY, lat),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
   );

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Douglas-Peucker polyline simplification.
 *
 * Iterative rather than recursive: the raw rings are long enough that a
 * recursive version risks a stack overflow in the build script.
 */
const simplify = (points: [number, number][], tolerance: number): [number, number][] => {
   if (points.length < 3) return points;

   const keep = new Uint8Array(points.length);
   keep[0] = 1;
   keep[points.length - 1] = 1;
   const stack: [number, number][] = [[0, points.length - 1]];

   while (stack.length > 0) {
      const [first, last] = stack.pop() as [number, number];
      if (last - first < 2) continue;

      const a = points[first];
      const b = points[last];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);

      let farthest = 0;
      let maxDistance = 0;
      for (let i = first + 1; i < last; i++) {
         const point = points[i];
         const distance =
            length === 0
               ? Math.hypot(point[0] - a[0], point[1] - a[1])
               : Math.abs(dy * point[0] - dx * point[1] + b[0] * a[1] - b[1] * a[0]) / length;

         if (distance > maxDistance) {
            maxDistance = distance;
            farthest = i;
         }
      }

      if (maxDistance > tolerance) {
         keep[farthest] = 1;
         stack.push([first, farthest], [farthest, last]);
      }
   }

   return points.filter((_, index) => keep[index] === 1);
};
