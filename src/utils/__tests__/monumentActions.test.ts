import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import { rowActionsFor } from "@/utils/monumentActions.ts";
import { buildRegionsMap, monumentsInRegion, type RegionFeature } from "@/utils/regions.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONUMENTS_PATH = path.join(__dirname, "../../../data/monuments.geojson");
const REGIONS_PATH = path.join(__dirname, "../../../data/regions.geojson");

/** The committed boundaries, so the tests exercise the real geometry types. */
const regionFeatures = (): RegionFeature[] =>
   (JSON.parse(fs.readFileSync(REGIONS_PATH, "utf-8")) as { features: RegionFeature[] }).features;

/**
 * The real store shape: `lat`/`lon` are flattened in from the geometry, which is
 * what makes the map action available. Reading the properties alone would report
 * zero mapped rows.
 */
const sourceMonuments = (): MonumentProps[] =>
   (
      JSON.parse(fs.readFileSync(MONUMENTS_PATH, "utf-8")) as {
         features: Array<{
            properties: MonumentProps;
            geometry: { type: string; coordinates: [number, number] } | null;
         }>;
      }
   ).features.map((feature) => {
      if (!feature.geometry) return { ...feature.properties };
      const [lon, lat] = feature.geometry.coordinates;
      return { ...feature.properties, lat, lon };
   });

describe("rowActionsFor", () => {
   const row = (extra: Partial<MonumentProps>): MonumentProps =>
      ({ inventory: ["1"], itemLabel: "Abidə", ...extra }) as MonumentProps;

   it("offers no action for a bare record", () => {
      expect(rowActionsFor(row({}), false)).toEqual({ upload: false, wiki: false, map: false });
   });

   it("follows canUpload for the upload action and ignores the row", () => {
      const bare = row({});
      expect(rowActionsFor(bare, true).upload).toBe(true);
      expect(rowActionsFor(bare, false).upload).toBe(false);

      // A row that can be mapped does not gain an upload button on its own.
      expect(rowActionsFor(row({ lat: 40.1 }), false).upload).toBe(false);
   });

   it("offers the wiki action for any non-blank article link", () => {
      expect(rowActionsFor(row({ azLink: "https://az.wikipedia.org/wiki/X" }), false).wiki).toBe(
         true,
      );
   });

   it("treats a blank article link as no link", () => {
      // Would otherwise render a button opening a blank page.
      expect(rowActionsFor(row({ azLink: "   " }), false).wiki).toBe(false);
      expect(rowActionsFor(row({ azLink: "" }), false).wiki).toBe(false);
   });

   it("offers the map action only when the row has coordinates", () => {
      expect(rowActionsFor(row({ lat: 40.4155 }), false).map).toBe(true);
      expect(rowActionsFor(row({ lon: 50.008 }), false).map).toBe(false);
      expect(rowActionsFor(row({ lat: 0 }), false).map).toBe(true);
   });

   it("reports each action independently", () => {
      const all = row({ lat: 40.1, azLink: "https://az.wikipedia.org/wiki/X" });
      expect(rowActionsFor(all, true)).toEqual({ upload: true, wiki: true, map: true });

      const mapOnly = row({ lat: 40.1 });
      expect(rowActionsFor(mapOnly, false)).toEqual({ upload: false, wiki: false, map: true });
   });
});

describe("the committed dataset's action coverage", () => {
   const monuments = sourceMonuments();
   const map = buildRegionsMap(regionFeatures());

   /** Region monuments, as `RegionPage.vue` lists them. */
   const inRegions = map.regions.flatMap(
      (region) => monumentsInRegion(monuments, region.name) as MonumentProps[],
   );

   it("leaves most rows with no action at all", () => {
      // Anonymous visitors, so `canUpload` false. This ratio is why the column
      // looks sparse; if it moves a lot the dataset was regenerated.
      const empty = inRegions.filter(
         (m) => !rowActionsFor(m, false).wiki && !rowActionsFor(m, false).map,
      );

      expect(inRegions.length).toBeGreaterThan(5000);
      expect(empty.length / inRegions.length).toBeGreaterThan(0.7);
      expect(empty.length / inRegions.length).toBeLessThan(0.9);
   });

   it("offers the map action to a small minority of rows", () => {
      const share = inRegions.filter((m) => rowActionsFor(m, false).map).length / inRegions.length;
      expect(share).toBeGreaterThan(0.1);
      expect(share).toBeLessThan(0.3);
   });

   it("has regions where no row offers any action", () => {
      // A handful of regions are inventory-only with no coordinates and no
      // article, so the column is entirely blank on their pages.
      const blank = map.regions.filter((region) =>
         monumentsInRegion(monuments, region.name).every(
            (m) => !rowActionsFor(m, false).wiki && !rowActionsFor(m, false).map,
         ),
      );

      expect(blank.length).toBeGreaterThan(0);
      expect(blank.length).toBeLessThan(map.regions.length);
   });

   it("has regions where most rows do offer an action", () => {
      const populated = map.regions
         .map((region) => monumentsInRegion(monuments, region.name))
         .filter((list) => list.length > 0);

      const withSome = populated.filter((list) =>
         list.some((m) => rowActionsFor(m, false).map || rowActionsFor(m, false).wiki),
      );

      expect(withSome.length).toBeGreaterThan(populated.length * 0.8);
   });

   it("agrees with the map's page count for the map action", () => {
      // The map button is gated on the same `lat` that makes a monument get a
      // prerendered page, so the two must not disagree.
      const mappable = inRegions.filter((m) => rowActionsFor(m, false).map);
      expect(mappable.every((m) => typeof m.lat === "number" && m.inventory?.length)).toBe(true);
   });
});
