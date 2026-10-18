/**
 * Region helpers for the `/regions` map and the `/region/<name>` pages.
 *
 * Single source of truth for three things that must never drift apart:
 *
 * 1. Which region a monument belongs to — a strict equality test on
 *    `properties.parentLabel` against the region's own name. Nothing else is
 *    consulted. No coordinates, no address, no `P131`, no inventory number.
 *    A monument with an empty or unmatched `parentLabel` therefore belongs to
 *    no region at all and appears on no region page.
 * 2. How a region name becomes a URL — `regionPath`, used by both the map and
 *    any other link, so there is no second name-to-URL table.
 * 3. How the map payload is shaped — the geojson -> simplified WGS84
 *    FeatureCollection conversion below runs at build time in
 *    `scripts/write-regions-map.ts` and writes `public/regions-geo.json`,
 *    which the `/regions` map registers with ECharts. The source
 *    `data/regions.geojson` is read-only and is never rewritten.
 */

import type { MonumentProps } from "@/types";
import { getCanonicalId } from "./monumentFormatters";

/** Property holding the native (Azerbaijani) region name in regions.geojson. */
export const REGION_NAME_PROPERTY = "Name_AZ";

/** Where the generated map payload lives, mirroring `public/home-data.json`. */
export const REGIONS_MAP_URL = "/regions-geo.json";

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

/** One region's coverage, as the generated map payload carries it. */
export interface RegionCoverage {
   /** `Name_AZ`, the canonical region name used in URLs and matched on the map. */
   name: string;
   /** Monuments the region matches by `parentLabel`; 0 when none are recorded. */
   total: number;
   /** How many of those have an `image`. */
   withPhoto: number;
   /**
    * `withPhoto / total` to one decimal, or `null` when the region has no
    * monuments. A real 0% and "nothing recorded" are different things and the
    * map colours them differently.
    */
   percent: number | null;
}

/** Simplified region geometry in WGS84. A discriminated union so ECharts' GeoJSON types accept it. */
export type RegionGeometry =
   | { type: "Polygon"; coordinates: number[][][] }
   | { type: "MultiPolygon"; coordinates: number[][][][] };

/** One region's simplified boundary. `properties.name` is what ECharts matches data on. */
export interface RegionGeoFeature {
   type: "Feature";
   properties: { name: string };
   geometry: RegionGeometry;
}

/** Simplified boundaries of every region, ready for `registerMap`. */
export interface RegionGeoCollection {
   type: "FeatureCollection";
   features: RegionGeoFeature[];
}

/** Everything `RegionsMap.vue` and the region list need from `regions-geo.json`. */
export interface RegionsMapData {
   /** Simplified WGS84 boundaries, one feature per region. */
   geoJson: RegionGeoCollection;
   /** One coverage entry per feature, in the same order as `geoJson.features`. */
   regions: RegionCoverage[];
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
export const parseRegionsGeo = (json: string | null | undefined): RegionsMapData | null => {
   if (!json) return null;

   try {
      const parsed = JSON.parse(json) as Partial<RegionsMapData> | null;
      if (!parsed || typeof parsed !== "object") return null;

      const geoJson = parsed.geoJson;
      if (!geoJson || geoJson.type !== "FeatureCollection" || !Array.isArray(geoJson.features)) {
         return null;
      }
      if (!Array.isArray(parsed.regions)) return null;

      const features = geoJson.features.filter(
         (feature): feature is RegionGeoFeature =>
            !!feature &&
            feature.type === "Feature" &&
            typeof feature.properties?.name === "string" &&
            feature.properties.name.length > 0 &&
            isRegionGeometry(feature.geometry),
      );

      const regions = parsed.regions.filter(
         (region): region is RegionCoverage =>
            !!region &&
            typeof region.name === "string" &&
            region.name.length > 0 &&
            typeof region.total === "number" &&
            typeof region.withPhoto === "number" &&
            (region.percent === null || typeof region.percent === "number"),
      );

      return { geoJson: { type: "FeatureCollection", features }, regions };
   } catch (e) {
      console.warn("Failed to parse regions map payload", e);
      return null;
   }
};

const isRegionGeometry = (
   geometry: RegionGeometry | null | undefined,
): geometry is RegionGeometry => {
   if (!geometry) return false;
   if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return false;
   return Array.isArray(geometry.coordinates);
};

/**
 * The map's true aspect ratio: the cosine of the collection's mid-latitude.
 *
 * Longitude degrees are narrower than latitude degrees away from the equator.
 * ECharts multiplies the raw bounding box's aspect by `aspectScale`, so the
 * value that keeps Azerbaijan's true shape (the same cosine the old SVG
 * projection used) is this one. ECharts' default of 0.75 is tuned for maps of
 * China and would stretch the country ~2%. Falls back to that default for an
 * empty collection, where the value cannot matter.
 */
export const regionAspectScale = (collection: RegionGeoCollection): number => {
   let minLat = Infinity;
   let maxLat = -Infinity;

   for (const feature of collection.features) {
      eachPoint(feature.geometry, (_lon, lat) => {
         if (lat < minLat) minLat = lat;
         if (lat > maxLat) maxLat = lat;
      });
   }

   if (!Number.isFinite(minLat) || !Number.isFinite(maxLat)) return 0.75;
   return Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) || 0.75;
};

/** Walks every coordinate of a geometry, Polygon and MultiPolygon alike. */
const eachPoint = (geometry: RegionGeometry, visit: (lon: number, lat: number) => void): void => {
   const polygons: number[][][][] =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

   for (const polygon of polygons) {
      for (const ring of polygon) {
         for (const [lon, lat] of ring) {
            visit(lon, lat);
         }
      }
   }
};

/**
 * Coverage for every built feature, in feature order.
 *
 * Runs the same `regionPhotoStats` the `/region/<name>` pages run, over the
 * same `data/monuments.geojson`, so the map cannot disagree with a region page
 * about its own numbers. Regions with no recorded monuments get `total: 0` and
 * `percent: null`.
 */
export const regionCoverages = (
   features: RegionGeoFeature[],
   monuments: MonumentProps[],
): RegionCoverage[] =>
   features.map((feature) => {
      const stats = regionPhotoStats(monuments, feature.properties.name);
      return {
         name: feature.properties.name,
         total: stats?.total ?? 0,
         withPhoto: stats?.withPhoto ?? 0,
         percent: stats?.percent ?? null,
      };
   });

/** Which number the map shades its regions by. */
export type RegionMetric = "percent" | "total";

/**
 * A metric's legend scale, ready for the ECharts `visualMap`.
 *
 * `text` is in ECharts' `[max, min]` order, the way the legend reads top to
 * bottom.
 */
export interface RegionMetricScale {
   min: number;
   max: number;
   text: [string, string];
}

/**
 * A region's value under one metric, or `null` for the neutral
 * no-monuments colour.
 *
 * A region with nothing recorded stays out of the ramp in *every* metric: as
 * a count, 0 would shade like the bottom of the ramp and read as "a few
 * monuments" next to regions that hold one or two.
 */
export const regionMetricValue = (region: RegionCoverage, metric: RegionMetric): number | null => {
   if (metric === "percent") return region.percent;
   return region.total > 0 ? region.total : null;
};

/** A count metric's fallback legend end: the smallest readable scale. */
const EMPTY_COUNT_LEGEND_MAX = 10;

/** Rounds a legend end up to a readable number: tens up to 50, then fifties. */
const legendCeil = (value: number): number => {
   if (value <= EMPTY_COUNT_LEGEND_MAX) return EMPTY_COUNT_LEGEND_MAX;
   if (value <= 50) return Math.ceil(value / 10) * 10;
   return Math.ceil(value / 50) * 50;
};

/**
 * The legend for one metric: fixed 0–100% for coverage, and a rounded ceiling
 * of the largest count otherwise, so the darkest region never stops far from
 * the end of the ramp.
 */
export const regionMetricScale = (
   regions: readonly RegionCoverage[],
   metric: RegionMetric,
): RegionMetricScale => {
   if (metric === "percent") return { min: 0, max: 100, text: ["100%", "0%"] };

   let max = 0;
   for (const region of regions) {
      if (region.total > max) max = region.total;
   }

   const ceiling = legendCeil(max);
   return { min: 0, max: ceiling, text: [String(ceiling), "0"] };
};

/**
 * The fill level of a region's list card, 0–1.
 *
 * Exactly `percent / 100`: the bar sits behind the printed percentage, so a
 * bar that disagrees with the number next to it reads as a bug. (An earlier
 * square-root scale spread the bottom-heavy coverage but made every bar
 * longer than its label.) Linear also matches the map's own 0–100% ramp, so
 * list and map describe the same coverage the same way.
 *
 * Regions with nothing recorded are deliberately `0`: the map paints them
 * neutral for the same reason — "no monuments recorded" is a different fact
 * from "0% photographed", so neither gets a bar.
 */
export const regionBarFill = (region: RegionCoverage): number => {
   if (region.total <= 0 || region.percent === null) return 0;
   return Math.min(1, Math.max(0, region.percent) / 100);
};

/**
 * Default Douglas-Peucker tolerance in ground-equivalent degrees.
 *
 * The raw boundaries are ~10 MB of source geometry whose rings hold hundreds
 * of thousands of points. At this tolerance the shipped payload is around
 * 250 KB and the outline still reads cleanly at every zoom the map allows,
 * including the enclaves and the detached Nakhchivan.
 */
export const DEFAULT_REGION_TOLERANCE = 0.0015;

/** Decimal places kept per coordinate: 1e-4 degrees is ~11 m. */
const COORDINATE_DECIMALS = 4;

/** Options for `buildRegionsGeoJson`. */
export interface BuildRegionsGeoOptions {
   /** Douglas-Peucker tolerance in ground-equivalent degrees. */
   tolerance?: number;
}

/**
 * Converts region features into a simplified WGS84 FeatureCollection.
 *
 * Handles Polygon and MultiPolygon through one code path: a Polygon's rings
 * are treated as a single-element MultiPolygon, so the ring walk below never
 * branches on geometry type. Holes are preserved as inner rings, and rings the
 * simplification collapses below a triangle are dropped — a polygon keeps only
 * the rings that still enclose area, and a feature without one is dropped
 * entirely (the build script treats a missing real region as an error).
 *
 * A MultiPolygon that loses parts still ships as a MultiPolygon even when one
 * part is left, so geometry types stay as the source spells them.
 */
export const buildRegionsGeoJson = (
   features: RegionFeature[],
   { tolerance = DEFAULT_REGION_TOLERANCE }: BuildRegionsGeoOptions = {},
): RegionGeoCollection => {
   const shapes: { name: string; polygons: number[][][][]; multipolygon: boolean }[] = [];
   let minLat = Infinity;
   let maxLat = -Infinity;

   for (const feature of features) {
      const name = feature.properties?.[REGION_NAME_PROPERTY];
      if (!feature.geometry || typeof name !== "string" || !name) continue;

      const polygons: number[][][][] =
         feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates as number[][][]]
            : (feature.geometry.coordinates as number[][][][]);

      for (const polygon of polygons) {
         for (const ring of polygon) {
            for (const point of ring) {
               const lat = point?.[1];
               if (typeof lat === "number" && Number.isFinite(lat)) {
                  if (lat < minLat) minLat = lat;
                  if (lat > maxLat) maxLat = lat;
               }
            }
         }
      }

      shapes.push({ name, polygons, multipolygon: feature.geometry.type === "MultiPolygon" });
   }

   // Longitude degrees are narrower than latitude degrees away from the
   // equator. Distances are measured on longitude scaled by cos(midLat) so the
   // tolerance means the same ground distance in both axes; the output stays
   // in plain lon/lat.
   const lonScale =
      Number.isFinite(minLat) && Number.isFinite(maxLat)
         ? Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180)) || 1
         : 1;

   const built: RegionGeoFeature[] = [];
   for (const shape of shapes) {
      const polygons: number[][][][] = [];

      for (const polygon of shape.polygons) {
         // An empty ring list or a collapsed outer ring leaves nothing to fill;
         // holes may collapse independently of their polygon.
         const outer = polygon.length > 0 ? simplifyRing(polygon[0], tolerance, lonScale) : null;
         if (!outer) continue;

         const holes = polygon
            .slice(1)
            .map((ring) => simplifyRing(ring, tolerance, lonScale))
            .filter((ring): ring is number[][] => ring !== null);

         polygons.push([outer, ...holes]);
      }

      if (polygons.length === 0) continue;

      built.push({
         type: "Feature",
         properties: { name: shape.name },
         geometry: shape.multipolygon
            ? { type: "MultiPolygon", coordinates: polygons }
            : { type: "Polygon", coordinates: polygons[0] },
      });
   }

   return { type: "FeatureCollection", features: built };
};

/**
 * Simplifies one ring to `tolerance` and rounds its coordinates, returning
 * `null` when nothing drawable is left.
 *
 * The source rings are closed (first point repeated at the end); the duplicate
 * is dropped before simplifying so the ends do not pin two identical points,
 * and the output is closed again as GeoJSON requires. Consecutive points that
 * land on the same rounded coordinate are dropped so a collapsed ring cannot
 * masquerade as a polygon.
 */
const simplifyRing = (ring: number[][], tolerance: number, lonScale: number): number[][] | null => {
   const points: [number, number][] = [];
   for (const point of ring) {
      const lon = point?.[0];
      const lat = point?.[1];
      if (
         typeof lon === "number" &&
         Number.isFinite(lon) &&
         typeof lat === "number" &&
         Number.isFinite(lat)
      ) {
         points.push([lon * lonScale, lat]);
      }
   }

   const first = points[0];
   const last = points[points.length - 1];
   if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop();
   if (points.length < 3) return null;

   const simplified = tolerance > 0 ? simplify(points, tolerance) : points;
   if (simplified.length < 3) return null;

   const output: number[][] = [];
   for (const [scaledLon, lat] of simplified) {
      const lon = roundCoordinate(scaledLon / lonScale);
      const value = [lon, roundCoordinate(lat)];
      const previous = output[output.length - 1];
      if (!previous || previous[0] !== value[0] || previous[1] !== value[1]) output.push(value);
   }

   if (output.length < 3) return null;
   output.push([output[0][0], output[0][1]]);
   return output;
};

const roundCoordinate = (value: number): number => {
   const factor = 10 ** COORDINATE_DECIMALS;
   return Math.round(value * factor) / factor;
};

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
