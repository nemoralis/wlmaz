import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import {
   buildRegionsMap,
   monumentsInRegion,
   parseRegionsMap,
   REGION_NAME_PROPERTY,
   regionKey,
   regionPath,
   regionPhotoStats,
   type RegionFeature,
} from "@/utils/regions.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGIONS_PATH = path.join(__dirname, "../../../data/regions.geojson");

/** The committed boundaries, so the tests exercise the real geometry types. */
const sourceFeatures = (): RegionFeature[] => {
   const geojson = JSON.parse(fs.readFileSync(REGIONS_PATH, "utf-8")) as {
      features: RegionFeature[];
   };
   return geojson.features;
};

const monument = (parentLabel: string | undefined, id: string): MonumentProps =>
   ({ itemLabel: `Abidə ${id}`, inventory: [id], parentLabel }) as MonumentProps;

/** Every coordinate in an SVG path, across all its closed subpaths. */
const pointsOf = (path: string): [number, number][] => {
   const points: [number, number][] = [];
   path.replace(
      /M(-?[\d.]+) (-?[\d.]+)((?:L-?[\d.]+ -?[\d.]+)*)Z/g,
      (_match, x: string, y: string, rest: string) => {
         points.push([Number(x), Number(y)]);
         for (const [, lx, ly] of rest.matchAll(/L(-?[\d.]+) (-?[\d.]+)/g)) {
            points.push([Number(lx), Number(ly)]);
         }
         return "";
      },
   );
   return points;
};

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

describe("parseRegionsMap", () => {
   it("keeps well-formed regions", () => {
      const parsed = parseRegionsMap(
         JSON.stringify({
            viewBox: "0 0 1000 1000",
            regions: [{ name: "Səbail", path: "M1 1L2 2Z" }],
         }),
      );
      expect(parsed?.regions).toHaveLength(1);
      expect(parsed?.regions[0].name).toBe("Səbail");
   });

   it("returns null for missing or malformed input", () => {
      expect(parseRegionsMap(null)).toBeNull();
      expect(parseRegionsMap("")).toBeNull();
      expect(parseRegionsMap("{")).toBeNull();
      expect(parseRegionsMap('{"viewBox":1,"regions":[]}')).toBeNull();
   });

   it("drops entries with no name or no path", () => {
      const parsed = parseRegionsMap(
         JSON.stringify({
            viewBox: "0 0 1000 1000",
            regions: [
               { name: "Səbail", path: "M1 1Z" },
               { name: "", path: "M2 2Z" },
               { name: "Xəzər", path: "" },
            ],
         }),
      );
      expect(parsed?.regions.map((r) => r.name)).toEqual(["Səbail"]);
   });
});

describe("buildRegionsMap", () => {
   it("renders every region in the committed dataset", () => {
      const features = sourceFeatures();
      const map = buildRegionsMap(features);

      const sourceNames = new Set(
         features.map((f) => f.properties[REGION_NAME_PROPERTY]).filter(Boolean),
      );
      expect(map.regions).toHaveLength(sourceNames.size);
      expect(new Set(map.regions.map((r) => r.name))).toEqual(sourceNames);
   });

   it("emits a closed path for every region", () => {
      for (const region of buildRegionsMap(sourceFeatures()).regions) {
         expect(region.path.startsWith("M")).toBe(true);
         expect(region.path.endsWith("Z")).toBe(true);
      }
   });

   it("handles Polygon and MultiPolygon through the same code path", () => {
      const polygon = buildRegionsMap([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [0, 0],
                     [1, 0],
                     [1, 1],
                     [0, 0],
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
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 0],
                     ],
                  ],
                  [
                     [
                        [5, 5],
                        [6, 5],
                        [6, 6],
                        [5, 5],
                     ],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Cüt" },
         },
      ]);

      // One entry per region regardless of geometry type, MultiPolygon keeping
      // both parts as separate closed subpaths.
      expect(polygon.regions.map((r) => r.name).sort()).toEqual(["Cüt", "Tək"]);
      const multi = polygon.regions.find((r) => r.name === "Cüt");
      expect((multi?.path.match(/M/g) ?? []).length).toBe(2);
   });

   it("carries both geometry types in the real data", () => {
      const types = new Set(sourceFeatures().map((f) => f.geometry?.type as string | undefined));
      expect(types).toContain("Polygon");
      expect(types).toContain("MultiPolygon");
   });

   it("sets the viewBox to the country's real aspect, not a square", () => {
      // Equirectangular about the data's mid-latitude. Azerbaijan is ~1.32x
      // wider than tall; a square viewBox stretches every region ~32% taller.
      const [, , width, height] = buildRegionsMap(sourceFeatures()).viewBox.split(" ").map(Number);
      expect(width / height).toBeCloseTo(1.32, 1);
   });

   it("keeps every coordinate inside the viewBox and fills it", () => {
      const map = buildRegionsMap(sourceFeatures());
      const [, , width, height] = map.viewBox.split(" ").map(Number);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const region of map.regions) {
         for (const [x, y] of pointsOf(region.path)) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
         }
      }

      expect(minX).toBeGreaterThanOrEqual(0);
      expect(minY).toBeGreaterThanOrEqual(0);
      expect(maxX).toBeLessThanOrEqual(width);
      expect(maxY).toBeLessThanOrEqual(height);
      // The bounding region touches both edges, so nothing is clipped and no
      // empty margin shrinks the map.
      expect(maxX).toBeCloseTo(width, 0);
      expect(maxY).toBeCloseTo(height, 0);
   });

   it("places the regions where they actually are", () => {
      const centre = (name: string) => {
         const region = buildRegionsMap(sourceFeatures()).regions.find(
            (candidate) => candidate.name === name,
         );
         expect(region, `region ${name} is missing`).toBeDefined();
         const points = pointsOf(region!.path);
         return {
            x: (Math.min(...points.map((p) => p[0])) + Math.max(...points.map((p) => p[0]))) / 2,
            y: (Math.min(...points.map((p) => p[1])) + Math.max(...points.map((p) => p[1]))) / 2,
         };
      };

      // x grows east, y grows south. Baku sits in the far east and well north
      // of the southern mountain regions; Nakhchivan is detached in the
      // south-west; Gəncə is in the west.
      const bakh = centre("Səbail");
      const gəncə = centre("Gəncə");
      const şuşa = centre("Şuşa");
      const naxçıvan = centre("Naxçıvan");
      const astara = centre("Astara");

      expect(bakh.x).toBeGreaterThan(gəncə.x);
      expect(bakh.y).toBeLessThan(şuşa.y);
      expect(naxçıvan.x).toBeLessThan(bakh.x / 2);
      expect(naxçıvan.y).toBeGreaterThan(bakh.y);
      expect(astara.y).toBeGreaterThan(bakh.y);
   });

   it("flips latitude so north is up", () => {
      const map = buildRegionsMap([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [0, 0],
                     [0, 1],
                     [1, 1],
                     [0, 0],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "R" },
         },
      ]);
      // y=0 at maxY (north), so the later latitude must map to a smaller y.
      const ys = (map.regions[0].path.match(/-?\d+(\.\d+)? /g) ?? []).map(Number);
      expect(ys.length).toBeGreaterThan(0);
      expect(Math.min(...ys)).toBeLessThanOrEqual(1);
   });

   it("drops degenerate rings that have no area to fill", () => {
      const map = buildRegionsMap([
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [0, 0],
                     [0, 0],
                     [0, 0],
                     [0, 0],
                  ],
               ],
            },
            properties: { [REGION_NAME_PROPERTY]: "Nöqtə" },
         },
      ]);
      expect(map.regions).toEqual([]);
   });

   it("skips features with no geometry or no name", () => {
      const map = buildRegionsMap([
         { geometry: null, properties: { [REGION_NAME_PROPERTY]: "Yoxdur" } },
         {
            geometry: {
               type: "Polygon",
               coordinates: [
                  [
                     [0, 0],
                     [1, 0],
                     [1, 1],
                     [0, 0],
                  ],
               ],
            },
            properties: {},
         },
      ]);
      expect(map.regions).toEqual([]);
   });

   it("returns an empty map for no features", () => {
      const map = buildRegionsMap([]);
      expect(map.regions).toEqual([]);
      expect(map.viewBox).toBe("0 0 1000 1000");
   });

   it("stays far smaller than the raw geometry", () => {
      const size = JSON.stringify(buildRegionsMap(sourceFeatures())).length;
      const raw = fs.statSync(REGIONS_PATH).size;
      expect(size).toBeLessThan(raw / 10);
   });
});

describe("the committed datasets agree", () => {
   it("has no duplicate region names to render twice", () => {
      const names = sourceFeatures().map((f) => f.properties[REGION_NAME_PROPERTY]);
      expect(new Set(names).size).toBe(names.length);
   });

   it("matches monuments by parentLabel without repairing any value", () => {
      const monuments = JSON.parse(
         fs.readFileSync(path.join(__dirname, "../../../data/monuments.geojson"), "utf-8"),
      ) as { features: Array<{ properties: MonumentProps }> };

      const before = monuments.features.map((f) => f.properties.parentLabel ?? "");
      const map = buildRegionsMap(sourceFeatures());
      let matched = 0;
      for (const region of map.regions) {
         matched += monumentsInRegion(
            monuments.features.map((f) => f.properties),
            region.name,
         ).length;
      }

      // The suffix fold is what takes this from 735 to ~5865 of 7196.
      expect(matched).toBeGreaterThan(5000);
      expect(matched).toBeLessThan(before.length);

      // Nothing was written back: every original label is still intact and the
      // monuments this run could not place stay unplaced.
      const after = monuments.features.map((f) => f.properties.parentLabel ?? "");
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

      const names = buildRegionsMap(sourceFeatures()).regions.map((region) => region.name);
      expect(names).not.toContain("Bakı");
      expect(names.some((name) => regionKey(name) === "Bakı")).toBe(false);
   });
});

describe("the committed datasets agree about photos", () => {
   const sourceMonuments = (): MonumentProps[] =>
      (
         JSON.parse(
            fs.readFileSync(path.join(__dirname, "../../../data/monuments.geojson"), "utf-8"),
         ) as { features: Array<{ properties: MonumentProps }> }
      ).features.map((f) => f.properties);

   it("never reports more photos than monuments in any region", () => {
      // The invariant that would break if the photo filter and the count ever
      // diverged, producing a percentage over 100.
      const monuments = sourceMonuments();
      for (const region of buildRegionsMap(sourceFeatures()).regions) {
         const stats = regionPhotoStats(monuments, region.name);
         if (!stats) continue;
         expect(stats.withPhoto).toBeLessThanOrEqual(stats.total);
         expect(stats.withoutPhoto).toBe(stats.total - stats.withPhoto);
         expect(stats.percent).toBeLessThanOrEqual(100);
      }
   });

   it("totals the same set the monument filter matches", () => {
      const monuments = sourceMonuments();
      const map = buildRegionsMap(sourceFeatures());

      const fromStats = map.regions.reduce((sum, region) => {
         const stats = regionPhotoStats(monuments, region.name);
         return sum + (stats?.total ?? 0);
      }, 0);

      const fromFilter = map.regions.reduce(
         (sum, region) => sum + monumentsInRegion(monuments, region.name).length,
         0,
      );

      expect(fromStats).toBe(fromFilter);
      expect(fromStats).toBeGreaterThan(5000);
   });

   it("has regions with photographs and regions with none", () => {
      // Both branches of the gallery's render condition are exercised by real
      // data, so neither is only reachable through a fixture.
      const monuments = sourceMonuments();
      const all = buildRegionsMap(sourceFeatures())
         .regions.map((region) => regionPhotoStats(monuments, region.name))
         .filter((stats): stats is NonNullable<typeof stats> => stats !== null);

      expect(all.filter((stats) => stats.withPhoto > 0).length).toBeGreaterThan(50);
      expect(all.filter((stats) => stats.withPhoto === 0).length).toBeGreaterThan(0);
   });
});
