import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import {
   buildRegionsGeoJson,
   monumentsInRegion,
   parseRegionsGeo,
   REGION_NAME_PROPERTY,
   regionAspectScale,
   regionBarFill,
   regionCoverages,
   regionKey,
   regionMetricScale,
   regionMetricValue,
   regionPath,
   regionPhotoStats,
   type RegionCoverage,
   type RegionFeature,
   type RegionGeoCollection,
   type RegionGeoFeature,
} from "@/utils/regions.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGIONS_PATH = path.join(__dirname, "../../../data/regions.geojson");
const MONUMENTS_PATH = path.join(__dirname, "../../../data/monuments.geojson");

/** The committed boundaries, so the tests exercise the real geometry types. */
let cachedFeatures: RegionFeature[] | null = null;
const sourceFeatures = (): RegionFeature[] => {
   cachedFeatures ??= (
      JSON.parse(fs.readFileSync(REGIONS_PATH, "utf-8")) as { features: RegionFeature[] }
   ).features;
   return cachedFeatures;
};

/** The committed boundaries as the map ships them. Building is heavy, so once. */
let cachedGeo: RegionGeoCollection | null = null;
const builtGeo = (): RegionGeoCollection => {
   cachedGeo ??= buildRegionsGeoJson(sourceFeatures());
   return cachedGeo;
};

const sourceMonuments = (): MonumentProps[] =>
   (
      JSON.parse(fs.readFileSync(MONUMENTS_PATH, "utf-8")) as {
         features: Array<{ properties: MonumentProps }>;
      }
   ).features.map((feature) => feature.properties);

/** Every polygon of a collection, Polygon and MultiPolygon alike. */
const polygonsOf = (collection: RegionGeoCollection): number[][][][] => {
   const polygons: number[][][][] = [];
   for (const feature of collection.features) {
      if (feature.geometry.type === "Polygon") polygons.push(feature.geometry.coordinates);
      else polygons.push(...feature.geometry.coordinates);
   }
   return polygons;
};

const monument = (parentLabel: string | undefined, id: string): MonumentProps =>
   ({ itemLabel: `Abidə ${id}`, inventory: [id], parentLabel }) as MonumentProps;

describe("regionKey", () => {
   it("folds a district suffix onto the bare region name", () => {
      expect(regionKey("Şəki rayonu")).toBe("Şəki");
      expect(regionKey("Səbail rayonu")).toBe("Səbail");
   });

   it("leaves an already-bare name untouched", () => {
      expect(regionKey("Gəncə")).toBe("Gəncə");
      // The 86 region names pass through unchanged: none ends in "rayonu".
      for (const name of sourceFeatures().map((f) => f.properties[REGION_NAME_PROPERTY])) {
         expect(regionKey(String(name))).toBe(name);
      }
   });

   it("trims surrounding whitespace", () => {
      expect(regionKey("  Səbail rayonu  ")).toBe("Səbail");
   });

   it("keeps the suffix case-insensitive without inventing matches", () => {
      expect(regionKey("Şəki Rayonu")).toBe("Şəki");
   });

   it("treats an absent label as empty", () => {
      expect(regionKey(undefined)).toBe("");
      expect(regionKey(null)).toBe("");
      expect(regionKey("")).toBe("");
   });

   it("does not fold Baku onto any of its districts", () => {
      // "Bakı" is a parentLabel but not one of the 86 region names. Spreading
      // it across the twelve Baku districts would be guessing.
      const names = new Set(sourceFeatures().map((f) => f.properties[REGION_NAME_PROPERTY]));
      expect(names.has("Bakı")).toBe(false);
      expect(regionKey("Bakı")).toBe("Bakı");
   });

   it("does not strip a suffix that is not the district word", () => {
      expect(regionKey("Şuşa Dövlət Tarix-Memarlıq Qoruğu")).toBe(
         "Şuşa Dövlət Tarix-Memarlıq Qoruğu",
      );
   });
});

describe("regionPath", () => {
   it("percent-encodes Azerbaijani characters", () => {
      expect(regionPath("Səbail")).toBe("/region/S%C9%99bail");
      expect(regionPath("İsmayıllı")).toBe("/region/%C4%B0smay%C4%B1ll%C4%B1");
      expect(regionPath("Yevlax")).toBe("/region/Yevlax");
   });

   it("round-trips through decodeURIComponent", () => {
      for (const name of ["Səbail", "İsmayıllı", "Naxçıvan", "Göygöl", "Şuşa", "Kəlbəcər"]) {
         const encoded = regionPath(name);
         expect(decodeURIComponent(encoded.replace("/region/", ""))).toBe(name);
      }
   });

   it("matches an existing region name verbatim", () => {
      const name = "Səbail";
      expect(regionPath(name)).toBe(`/region/${encodeURIComponent(name)}`);
   });
});

describe("monumentsInRegion", () => {
   it("matches on the exact parentLabel", () => {
      const list = [monument("Səbail", "1"), monument("Xəzər", "2")];
      expect(monumentsInRegion(list, "Səbail")).toEqual([list[0]]);
   });

   it("unions both spellings of the same region", () => {
      const bare = monument("Şəki", "1");
      const suffixed = monument("Şəki rayonu", "2");
      const list = [bare, suffixed, monument("Gəncə", "3")];

      const found = monumentsInRegion(list, "Şəki");
      expect(found).toEqual([bare, suffixed]);
   });

   it("returns an empty list when nothing matches", () => {
      const list = [monument("Gəncə", "1"), monument("Ordubad", "2")];
      expect(monumentsInRegion(list, "Naftalan")).toEqual([]);
   });

   it("never claims a monument with an empty parentLabel", () => {
      const list = [monument(undefined, "1"), monument("", "2"), monument("Səbail", "3")];
      const found = monumentsInRegion(list, "Səbail");
      expect(found).toHaveLength(1);
      expect(found[0].inventory).toEqual(["3"]);
   });

   it("does not invent membership for an empty region name", () => {
      const list = [monument("Səbail rayonu", "1"), monument("", "2")];
      expect(monumentsInRegion(list, "")).toEqual([]);
      expect(monumentsInRegion(list, "   ")).toEqual([]);
   });

   it("does not substring-match a longer parentLabel", () => {
      const list = [monument("Şuşa Dövlət Tarix-Memarlıq Qoruğu", "1")];
      expect(monumentsInRegion(list, "Şuşa")).toEqual([]);
   });

   it("keeps the count equal to the filtered list length", () => {
      const list = [
         monument("Bakı", "1"),
         monument("Bakı", "2"),
         monument("Səbail rayonu", "3"),
         monument("Səbail", "4"),
         monument(undefined, "5"),
      ];
      for (const name of ["Səbail", "Gəncə", "Bakı", "Naftalan"]) {
         expect(monumentsInRegion(list, name).length).toBe(
            monumentsInRegion(list, name).filter((m) => m).length,
         );
      }
   });
});

describe("parseRegionsGeo", () => {
   const validPayload = JSON.stringify({
      geoJson: {
         type: "FeatureCollection",
         features: [
            {
               type: "Feature",
               properties: { name: "Səbail" },
               geometry: {
                  type: "Polygon",
                  coordinates: [
                     [
                        [49.8, 40.3],
                        [49.9, 40.3],
                        [49.9, 40.4],
                        [49.8, 40.3],
                     ],
                  ],
               },
            },
         ],
      },
      regions: [{ name: "Səbail", total: 10, withPhoto: 4, percent: 40 }],
   });

   it("keeps well-formed boundaries and coverage", () => {
      const parsed = parseRegionsGeo(validPayload);
      expect(parsed?.geoJson.features).toHaveLength(1);
      expect(parsed?.geoJson.features[0].properties.name).toBe("Səbail");
      expect(parsed?.regions).toEqual([{ name: "Səbail", total: 10, withPhoto: 4, percent: 40 }]);
   });

   it("returns null for missing or malformed input", () => {
      expect(parseRegionsGeo(null)).toBeNull();
      expect(parseRegionsGeo("")).toBeNull();
      expect(parseRegionsGeo("{")).toBeNull();
      expect(parseRegionsGeo("null")).toBeNull();
      // Coverage without boundaries is not a map, and neither is a feature
      // where a FeatureCollection belongs.
      expect(parseRegionsGeo(JSON.stringify({ regions: [] }))).toBeNull();
      expect(parseRegionsGeo(JSON.stringify({ geoJson: { type: "Feature" }, regions: [] }))).toBe(
         null,
      );
      expect(
         parseRegionsGeo(JSON.stringify({ geoJson: { type: "FeatureCollection" }, regions: [] })),
      ).toBeNull();
      expect(
         parseRegionsGeo(JSON.stringify({ geoJson: { type: "FeatureCollection", features: [] } })),
      ).toBeNull();
   });

   it("drops malformed features and coverage entries but keeps valid ones", () => {
      const parsed = parseRegionsGeo(
         JSON.stringify({
            geoJson: {
               type: "FeatureCollection",
               features: [
                  {
                     type: "Feature",
                     properties: { name: "" },
                     geometry: { type: "Polygon", coordinates: [[]] },
                  },
                  {
                     type: "Feature",
                     properties: { name: "Xəzər" },
                     geometry: { type: "Point", coordinates: [49, 40] },
                  },
                  {
                     type: "Feature",
                     properties: { name: "Səbail" },
                     geometry: {
                        type: "Polygon",
                        coordinates: [
                           [
                              [49.8, 40.3],
                              [49.9, 40.3],
                              [49.9, 40.4],
                              [49.8, 40.3],
                           ],
                        ],
                     },
                  },
               ],
            },
            regions: [
               { name: "Səbail", total: 10, withPhoto: 4, percent: 40 },
               { name: "", total: 1, withPhoto: 0, percent: 0 },
               { name: "Xəzər", total: "10", withPhoto: 0, percent: 0 },
               // A real 0% and a "nothing recorded" region both survive.
               { name: "Naftalan", total: 0, withPhoto: 0, percent: null },
            ],
         }),
      );

      expect(parsed?.geoJson.features.map((f) => f.properties.name)).toEqual(["Səbail"]);
      expect(parsed?.regions.map((r) => r.name)).toEqual(["Səbail", "Naftalan"]);
   });

   it("accepts the payload the build script writes", () => {
      const payload = {
         geoJson: builtGeo(),
         regions: regionCoverages(builtGeo().features, sourceMonuments()),
      };
      const parsed = parseRegionsGeo(JSON.stringify(payload));

      expect(parsed?.geoJson.features).toHaveLength(builtGeo().features.length);
      expect(parsed?.regions).toHaveLength(builtGeo().features.length);
   });
});

describe("buildRegionsGeoJson", () => {
   it("keeps every region in the committed dataset", () => {
      const sourceNames = new Set(
         sourceFeatures()
            .map((f) => f.properties[REGION_NAME_PROPERTY])
            .filter(Boolean),
      );
      expect(builtGeo().features).toHaveLength(sourceNames.size);
      expect(new Set(builtGeo().features.map((f) => f.properties.name))).toEqual(sourceNames);
   });

   it("emits closed rings of at least four positions, rounded to 4 decimals", () => {
      const roundTrip = (value: number) => Math.round(value * 1e4) / 1e4;

      for (const polygon of polygonsOf(builtGeo())) {
         for (const ring of polygon) {
            expect(ring.length).toBeGreaterThanOrEqual(4);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
            for (const [lon, lat] of ring) {
               expect(Number.isFinite(lon)).toBe(true);
               expect(Number.isFinite(lat)).toBe(true);
               // Already rounded, so re-rounding changes nothing.
               expect(lon).toBe(roundTrip(lon));
               expect(lat).toBe(roundTrip(lat));
            }
         }
      }
   });

   it("keeps coordinates in WGS84 degrees", () => {
      // Azerbaijan's real extents, plus a small margin: ~44.7–50.5 E, 38.3–42 N.
      for (const polygon of polygonsOf(builtGeo())) {
         for (const ring of polygon) {
            for (const [lon, lat] of ring) {
               expect(lon).toBeGreaterThan(44);
               expect(lon).toBeLessThan(51);
               expect(lat).toBeGreaterThan(38);
               expect(lat).toBeLessThan(42.5);
            }
         }
      }
   });

   it("handles Polygon and MultiPolygon through the same code path", () => {
      const built = buildRegionsGeoJson([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [45, 40],
                     [45.2, 40],
                     [45.2, 40.2],
                     [45, 40],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Tək" },
         },
         {
            geometry: {
               type: "MultiPolygon",
               coordinates: [
                  [
                     [
                        [45.5, 40],
                        [45.7, 40],
                        [45.7, 40.2],
                        [45.5, 40],
                     ],
                  ],
                  [
                     [
                        [46, 40],
                        [46.2, 40],
                        [46.2, 40.2],
                        [46, 40],
                     ],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Cüt" },
         },
      ]);

      // One feature per region regardless of geometry type, MultiPolygon
      // keeping both parts.
      expect(built.features.map((f) => f.properties.name)).toEqual(["Tək", "Cüt"]);
      expect(built.features[0].geometry.type).toBe("Polygon");

      const multi = built.features[1].geometry;
      if (multi.type !== "MultiPolygon") throw new Error("expected a MultiPolygon");
      expect(multi.coordinates).toHaveLength(2);
   });

   it("carries both geometry types in the real data", () => {
      const types = new Set(sourceFeatures().map((f) => f.geometry?.type as string | undefined));
      expect(types).toContain("Polygon");
      expect(types).toContain("MultiPolygon");
   });

   it("preserves holes as inner rings", () => {
      const built = buildRegionsGeoJson([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [45, 40],
                     [45.4, 40],
                     [45.4, 40.3],
                     [45, 40.3],
                     [45, 40],
                  ],
                  [
                     [45.1, 40.05],
                     [45.2, 40.05],
                     [45.2, 40.15],
                     [45.1, 40.15],
                     [45.1, 40.05],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Deşik" },
         },
      ]);

      const geometry = built.features[0].geometry;
      if (geometry.type !== "Polygon") throw new Error("expected a Polygon");
      expect(geometry.coordinates).toHaveLength(2);

      const hole = geometry.coordinates[1];
      expect(hole[0]).toEqual(hole[hole.length - 1]);
      for (const [lon, lat] of hole) {
         expect(lon).toBeGreaterThanOrEqual(45.1);
         expect(lon).toBeLessThanOrEqual(45.2);
         expect(lat).toBeGreaterThanOrEqual(40.05);
         expect(lat).toBeLessThanOrEqual(40.15);
      }
   });

   it("drops degenerate rings and the features they leave empty", () => {
      const built = buildRegionsGeoJson([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [45, 40],
                     [45, 40],
                     [45, 40],
                     [45, 40],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Nöqtə" },
         },
      ]);
      expect(built.features).toEqual([]);
   });

   it("drops a collapsed hole but keeps its polygon", () => {
      const built = buildRegionsGeoJson([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [45, 40],
                     [45.4, 40],
                     [45.4, 40.3],
                     [45, 40.3],
                     [45, 40],
                  ],
                  [
                     [45.1, 40.05],
                     [45.1, 40.05],
                     [45.1, 40.05],
                     [45.1, 40.05],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Səthi" },
         },
      ]);

      const geometry = built.features[0].geometry;
      if (geometry.type !== "Polygon") throw new Error("expected a Polygon");
      expect(geometry.coordinates).toHaveLength(1);
   });

   it("skips features with no geometry or no name", () => {
      const built = buildRegionsGeoJson([
         { geometry: null, properties: { [REGION_NAME_PROPERTY]: "Yoxdur" } },
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [45, 40],
                     [45.2, 40],
                     [45.2, 40.2],
                     [45, 40],
                  ],
               ],
            },
            properties: {},
         },
      ]);
      expect(built.features).toEqual([]);
   });

   it("returns an empty collection for no features", () => {
      expect(buildRegionsGeoJson([])).toEqual({ type: "FeatureCollection", features: [] });
   });

   it("keeps each region where it is on the globe", () => {
      const bounds = (name: string) => {
         const feature = builtGeo().features.find(
            (candidate) => candidate.properties.name === name,
         );
         if (!feature) throw new Error(`region ${name} is missing from the built map`);

         const lons: number[] = [];
         const lats: number[] = [];
         for (const polygon of polygonsOf({ type: "FeatureCollection", features: [feature] })) {
            for (const ring of polygon) {
               for (const [lon, lat] of ring) {
                  lons.push(lon);
                  lats.push(lat);
               }
            }
         }
         return {
            midLon: (Math.min(...lons) + Math.max(...lons)) / 2,
            midLat: (Math.min(...lats) + Math.max(...lats)) / 2,
         };
      };

      // Baku sits in the far east and well north of the southern mountain
      // regions; Nakhchivan is detached in the south-west; Astara is the
      // southern tip; Gəncə is in the west.
      const bakh = bounds("Səbail");
      const gəncə = bounds("Gəncə");
      const şuşa = bounds("Şuşa");
      const naxçıvan = bounds("Naxçıvan");
      const astara = bounds("Astara");

      expect(bakh.midLon).toBeGreaterThan(gəncə.midLon);
      expect(bakh.midLat).toBeGreaterThan(şuşa.midLat);
      expect(naxçıvan.midLon).toBeLessThan(46);
      expect(naxçıvan.midLat).toBeLessThan(bakh.midLat);
      expect(astara.midLat).toBeLessThan(bakh.midLat);
   });

   it("stays far smaller than the raw geometry", () => {
      const size = JSON.stringify(builtGeo()).length;
      const raw = fs.statSync(REGIONS_PATH).size;
      expect(size).toBeLessThan(raw / 10);
   });

   it("removes more points at a larger tolerance without losing regions", () => {
      const pointsOf = (collection: RegionGeoCollection): number => {
         let points = 0;
         for (const polygon of polygonsOf(collection)) {
            for (const ring of polygon) points += ring.length;
         }
         return points;
      };

      const coarse = buildRegionsGeoJson(sourceFeatures(), { tolerance: 0.02 });
      const finer = buildRegionsGeoJson(sourceFeatures(), { tolerance: 0.002 });

      expect(coarse.features).toHaveLength(finer.features.length);
      expect(pointsOf(coarse)).toBeLessThan(pointsOf(finer));
   });
});

describe("regionAspectScale", () => {
   it("matches the committed data's mid-latitude cosine", () => {
      // Azerbaijan's mid-latitude is ~40.15°, so cos ≈ 0.76 — and ECharts'
      // 0.75 default is close but not exact.
      const scale = regionAspectScale(builtGeo());
      expect(scale).toBeGreaterThan(0.75);
      expect(scale).toBeLessThan(0.78);
   });

   it("falls back to ECharts' default for an empty collection", () => {
      expect(regionAspectScale({ type: "FeatureCollection", features: [] })).toBe(0.75);
   });
});

describe("regionCoverages", () => {
   const feature = (name: string): RegionGeoFeature => ({
      type: "Feature",
      properties: { name },
      geometry: {
         type: "Polygon",
         coordinates: [
            [
               [45, 40],
               [45.1, 40],
               [45.1, 40.1],
               [45, 40],
            ],
         ],
      },
   });

   const photographed = (parentLabel: string, id: string, image?: string): MonumentProps =>
      ({ itemLabel: `Abidə ${id}`, inventory: [id], parentLabel, image }) as MonumentProps;

   it("pairs each feature with the stats its region page would show", () => {
      const monuments = [
         photographed("Səbail rayonu", "1", "a.jpg"),
         photographed("Səbail rayonu", "2"),
      ];
      const coverage = regionCoverages([feature("Səbail"), feature("Gəncə")], monuments);

      expect(coverage[0]).toEqual({ name: "Səbail", total: 2, withPhoto: 1, percent: 50 });
      // A region with no monuments is "nothing recorded", not a real 0%.
      expect(coverage[1]).toEqual({ name: "Gəncə", total: 0, withPhoto: 0, percent: null });
   });

   it("keeps feature order", () => {
      const names = ["Xaçmaz", "Astara", "Şəki"];
      expect(regionCoverages(names.map(feature), []).map((c) => c.name)).toEqual(names);
   });

   it("matches every non-null percent to the page-level stats", () => {
      const monuments = sourceMonuments();
      for (const coverage of regionCoverages(builtGeo().features, monuments)) {
         const stats = regionPhotoStats(monuments, coverage.name);
         if (stats) {
            expect(coverage.percent).toBe(stats.percent);
            expect(coverage.withPhoto).toBe(stats.withPhoto);
            expect(coverage.total).toBe(stats.total);
         } else {
            expect(coverage.percent).toBeNull();
            expect(coverage.total).toBe(0);
         }
      }
   });
});

describe("regionMetricValue", () => {
   const coverage = (total: number, percent: number | null): RegionCoverage => ({
      name: "Naxçıvan",
      total,
      withPhoto: 0,
      percent,
   });

   it("returns the percentage for the coverage metric, null and all", () => {
      expect(regionMetricValue(coverage(4, 25), "percent")).toBe(25);
      // Nothing recorded: a real absence of data, not a 0% coverage.
      expect(regionMetricValue(coverage(0, null), "percent")).toBeNull();
   });

   it("returns the total for the count metric", () => {
      expect(regionMetricValue(coverage(22, 0), "total")).toBe(22);
   });

   it("keeps a region with nothing recorded out of the count ramp", () => {
      // Already a number, but 0 on a count legend would shade like the
      // lowest real value; the neutral no-data colour is the honest one.
      expect(regionMetricValue(coverage(0, null), "total")).toBeNull();
   });
});

describe("regionMetricScale", () => {
   const coverage = (total: number): RegionCoverage => ({
      name: `Region ${total}`,
      total,
      withPhoto: 0,
      percent: null,
   });

   it("keeps the coverage legend fixed at 0–100%", () => {
      expect(regionMetricScale([coverage(298), coverage(0)], "percent")).toEqual({
         min: 0,
         max: 100,
         text: ["100%", "0%"],
      });
   });

   it("rounds the count legend up to a readable ceiling", () => {
      // The committed maximum is 668 (Səbail), whose legend ends at 700 —
      // Baku's old town holds far more monuments than any other region.
      expect(regionMetricScale([coverage(668)], "total")).toEqual({
         min: 0,
         max: 700,
         text: ["700", "0"],
      });
      expect(regionMetricScale([coverage(298)], "total").max).toBe(300);
      expect(regionMetricScale([coverage(258)], "total").max).toBe(300);
      expect(regionMetricScale([coverage(173)], "total").max).toBe(200);
      expect(regionMetricScale([coverage(47)], "total").max).toBe(50);
      expect(regionMetricScale([coverage(37)], "total").max).toBe(40);
   });

   it("never shrinks below the smallest readable count scale", () => {
      expect(regionMetricScale([coverage(0)], "total").max).toBe(10);
      expect(regionMetricScale([], "total").max).toBe(10);
   });

   it("covers the largest count in the committed data", () => {
      const regions = regionCoverages(builtGeo().features, sourceMonuments());
      const maxTotal = Math.max(...regions.map((region) => region.total));
      const scale = regionMetricScale(regions, "total");
      expect(scale.max).toBeGreaterThanOrEqual(maxTotal);
      expect(scale.max).toBeLessThan(maxTotal + 50);
   });
});

describe("regionBarFill", () => {
   const coverage = (total: number, percent: number | null): RegionCoverage => ({
      name: "Naxçıvan",
      total,
      withPhoto: 0,
      percent,
   });

   it("stays unfilled for a region with nothing recorded", () => {
      // The map's neutral rule: no monuments is a different fact from 0%.
      expect(regionBarFill(coverage(0, null))).toBe(0);
   });

   it("maps a real 0% to no fill and 100% to a full bar", () => {
      expect(regionBarFill(coverage(4, 0))).toBe(0);
      expect(regionBarFill(coverage(4, 100))).toBe(1);
   });

   it("matches the printed percentage exactly", () => {
      // The bar is read against the label next to it: 7.1% must fill 7.1% of
      // the card and 75% must fill three quarters — no scale in between.
      expect(regionBarFill(coverage(151, 7.1))).toBeCloseTo(0.071, 4);
      expect(regionBarFill(coverage(20, 75))).toBeCloseTo(0.75, 4);
   });

   it("is monotonic in the percentage", () => {
      const fills = [1, 5, 20, 50, 90].map((percent) => regionBarFill(coverage(100, percent)));
      for (let i = 1; i < fills.length; i++) {
         expect(fills[i]).toBeGreaterThan(fills[i - 1]);
      }
   });

   it("clamps at a full bar if a percentage ever exceeds 100", () => {
      expect(regionBarFill(coverage(10, 120))).toBe(1);
   });
});

describe("the committed datasets agree", () => {
   it("has no duplicate region names to render twice", () => {
      const names = builtGeo().features.map((f) => f.properties.name);
      expect(new Set(names).size).toBe(names.length);
   });

   it("matches monuments by parentLabel without repairing any value", () => {
      const monuments = sourceMonuments();
      const before = monuments.map((m) => m.parentLabel ?? "");
      let matched = 0;
      for (const feature of builtGeo().features) {
         matched += monumentsInRegion(monuments, feature.properties.name).length;
      }

      // The suffix fold is what takes this from 735 to ~5865 of 7196.
      expect(matched).toBeGreaterThan(5000);
      expect(matched).toBeLessThan(before.length);

      // Nothing was written back: every original label is still intact and the
      // monuments this run could not place stay unplaced.
      const after = sourceMonuments().map((m) => m.parentLabel ?? "");
      expect(after).toEqual(before);
      expect(before.filter((label) => label === "").length).toBeGreaterThan(1000);
   });
});

describe("regionPhotoStats", () => {
   const monument = (parentLabel: string | undefined, id: string, image?: string): MonumentProps =>
      ({ itemLabel: `Abidə ${id}`, inventory: [id], parentLabel, image }) as MonumentProps;

   it("returns null when the region has no monuments", () => {
      expect(regionPhotoStats([], "Səbail")).toBeNull();
      expect(regionPhotoStats([monument("Şəki rayonu", "1", "a.jpg")], "Səbail")).toBeNull();
   });

   it("counts every monument the region matches, not only those with pages", () => {
      // None of these carry coordinates or an inventory beyond the id, so a
      // page-bearing-only denominator would report 0 here.
      const stats = regionPhotoStats(
         [
            monument("Səbail rayonu", "1"),
            monument("Səbail rayonu", "2"),
            monument("Səbail rayonu", "3"),
         ],
         "Səbail",
      );

      expect(stats?.total).toBe(3);
      expect(stats?.withPhoto).toBe(0);
      expect(stats?.withoutPhoto).toBe(3);
      expect(stats?.percent).toBe(0);
   });

   it("keeps the three counts summing to the total", () => {
      const stats = regionPhotoStats(
         [
            monument("Səbail rayonu", "1", "a.jpg"),
            monument("Səbail rayonu", "2", "b.jpg"),
            monument("Səbail rayonu", "3"),
            monument("Səbail rayonu", "4"),
         ],
         "Səbail",
      );

      expect(stats?.withPhoto).toBe(2);
      expect(stats?.withoutPhoto).toBe(2);
      expect(stats?.total).toBe(4);
      expect(stats!.withPhoto + stats!.withoutPhoto).toBe(stats!.total);
   });

   it("rounds the percentage to one decimal", () => {
      // 1 of 3 is 33.333...%
      const stats = regionPhotoStats(
         [
            monument("Səbail rayonu", "1", "a.jpg"),
            monument("Səbail rayonu", "2"),
            monument("Səbail rayonu", "3"),
         ],
         "Səbail",
      );
      expect(stats?.percent).toBe(33.3);
   });

   it("reports 100% when every monument has a photograph", () => {
      const stats = regionPhotoStats(
         [monument("Səbail rayonu", "1", "a.jpg"), monument("Səbail rayonu", "2", "b.jpg")],
         "Səbail",
      );
      expect(stats?.percent).toBe(100);
      expect(stats?.withoutPhoto).toBe(0);
   });

   it("does not count a blank image as a photograph", () => {
      const stats = regionPhotoStats(
         [
            monument("Səbail rayonu", "1", "   "),
            monument("Səbail rayonu", "2", ""),
            monument("Səbail rayonu", "3", "real.jpg"),
         ],
         "Səbail",
      );
      expect(stats?.withPhoto).toBe(1);
      expect(stats?.total).toBe(3);
   });

   it("treats a photographed but page-less region as real data, not absence", () => {
      // Naftalan and 20 other regions have monuments and no photographs; that is
      // a genuine 0% and must not be reported as "no data".
      const stats = regionPhotoStats(
         [monument("Ağdaş rayonu", "1"), monument("Ağdaş rayonu", "2")],
         "Ağdaş",
      );
      expect(stats).not.toBeNull();
      expect(stats?.percent).toBe(0);
      expect(stats?.photos).toHaveLength(0);
   });

   it("orders photos numerically by inventory so the gallery is stable", () => {
      const stats = regionPhotoStats(
         [
            monument("Səbail rayonu", "10", "a.jpg"),
            monument("Səbail rayonu", "9", "b.jpg"),
            monument("Səbail rayonu", "100", "c.jpg"),
            monument("Səbail rayonu", "1", "d.jpg"),
         ],
         "Səbail",
      );
      expect(stats?.photos.map((m) => m.inventory?.[0])).toEqual(["1", "9", "10", "100"]);
   });

   it("matches the district suffix exactly as the monument filter does", () => {
      const list = [monument("Səbail rayonu", "1", "a.jpg"), monument("Səbail rayonu", "2")];
      expect(regionPhotoStats(list, "Səbail rayonu")?.total).toBe(2);
      expect(regionPhotoStats(list, "Səbail")?.total).toBe(2);
   });

   it("is symmetric: it never guesses a region the boundaries do not contain", () => {
      // The match is label-to-name equality, so a name that exists only as a
      // `parentLabel` still matches itself. What keeps "Bakı" off the site is
      // that it is not a region in the boundaries file, so no route resolves it —
      // not a special case in here.
      expect(regionPhotoStats([monument("Bakı", "1", "a.jpg")], "Bakı")?.total).toBe(1);

      const names = builtGeo().features.map((feature) => feature.properties.name);
      expect(names).not.toContain("Bakı");
      expect(names.some((name) => regionKey(name) === "Bakı")).toBe(false);
   });
});

describe("the committed datasets agree about photos", () => {
   it("never reports more photos than monuments in any region", () => {
      // The invariant that would break if the photo filter and the count ever
      // diverged, producing a percentage over 100.
      const monuments = sourceMonuments();
      for (const feature of builtGeo().features) {
         const stats = regionPhotoStats(monuments, feature.properties.name);
         if (!stats) continue;
         expect(stats.withPhoto).toBeLessThanOrEqual(stats.total);
         expect(stats.withoutPhoto).toBe(stats.total - stats.withPhoto);
         expect(stats.percent).toBeLessThanOrEqual(100);
      }
   });

   it("totals the same set the monument filter matches", () => {
      const monuments = sourceMonuments();
      const features = builtGeo().features;

      const fromStats = features.reduce((sum, feature) => {
         const stats = regionPhotoStats(monuments, feature.properties.name);
         return sum + (stats?.total ?? 0);
      }, 0);

      const fromFilter = features.reduce(
         (sum, feature) => sum + monumentsInRegion(monuments, feature.properties.name).length,
         0,
      );

      expect(fromStats).toBe(fromFilter);
      expect(fromStats).toBeGreaterThan(5000);
   });

   it("has regions with photographs and regions with none", () => {
      // Both branches of the gallery's render condition are exercised by real
      // data, so neither is only reachable through a fixture.
      const monuments = sourceMonuments();
      const all = builtGeo()
         .features.map((feature) => regionPhotoStats(monuments, feature.properties.name))
         .filter((stats): stats is NonNullable<typeof stats> => stats !== null);

      expect(all.filter((stats) => stats.withPhoto > 0).length).toBeGreaterThan(50);
      expect(all.filter((stats) => stats.withPhoto === 0).length).toBeGreaterThan(0);
   });
});
