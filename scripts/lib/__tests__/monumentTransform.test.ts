import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
   INVENTORY_SEPARATOR,
   mergeDuplicateRows,
   splitInventoryGroups,
   transformToGeoJSON,
   type GeoJSONFeature,
} from "../monumentTransform";
import type { SparqlBinding, SparqlValue } from "../sparqlClient";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WKT_DATATYPE = "http://www.opengis.net/ont/geosparql#wktLiteral";

/** A plain (non-coordinate) SPARQL literal. */
const text = (value: string): SparqlValue => ({ type: "literal", value });

/** A GeoSPARQL WKT point literal, the shape `?coordinate` bindings arrive in. */
const wkt = (lon: number, lat: number): SparqlValue => ({
   type: "literal",
   datatype: WKT_DATATYPE,
   value: `Point(${lon} ${lat})`,
});

/**
 * Builds one SPARQL row for a monument. `inventory` is the raw GROUP_CONCAT
 * string (tab-joined) exactly as the query returns it.
 */
const monumentRow = ({
   item,
   inventory,
   lastModified = "2026-01-01T00:00:00Z",
   label = "Məscid",
   coordinate,
   extra,
}: {
   item: string;
   inventory?: string;
   lastModified?: string;
   label?: string;
   coordinate?: [number, number];
   extra?: Record<string, SparqlValue>;
}): SparqlBinding => ({
   item: text(`http://www.wikidata.org/entity/${item}`),
   itemLabel: text(label),
   lastModified: text(lastModified),
   ...(inventory !== undefined ? { inventory: text(inventory) } : {}),
   ...(coordinate ? { coordinate: wkt(coordinate[0], coordinate[1]) } : {}),
   ...extra,
});

// transformToGeoJSON logs merged/conflicting duplicate counts; silence both
// streams for every test in this file and assert on the calls where relevant.
beforeEach(() => {
   vi.spyOn(console, "log").mockImplementation(() => {});
   vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
   vi.restoreAllMocks();
});

const featuresOf = (bindings: SparqlBinding[]): GeoJSONFeature[] =>
   transformToGeoJSON(bindings).data.features;

describe("splitInventoryGroups", () => {
   it("splits the tab-concatenated GROUP_CONCAT value into register numbers", () => {
      expect(splitInventoryGroups("4712\t4712A")).toEqual(["4712", "4712A"]);
   });

   it("trims each id and drops empty entries", () => {
      expect(splitInventoryGroups(" 4712 \t\t4712A\t")).toEqual(["4712", "4712A"]);
   });

   it("returns an empty list for missing or blank values", () => {
      expect(splitInventoryGroups(undefined)).toEqual([]);
      expect(splitInventoryGroups("")).toEqual([]);
      expect(splitInventoryGroups("\t \t")).toEqual([]);
   });

   it("passes an already-split list through", () => {
      expect(splitInventoryGroups(["4712", " 4712A "])).toEqual(["4712", "4712A"]);
   });

   it("uses the same separator the SPARQL query concatenates with", () => {
      expect(INVENTORY_SEPARATOR).toBe("\t");
      const query = readFileSync(path.join(__dirname, "../../queries/monuments.rq"), "utf-8");
      expect(query).toContain('SEPARATOR = "\\t"');
   });
});

describe("transformToGeoJSON — coordinates", () => {
   it("turns a WKT Point literal into GeoJSON [lon, lat] and keeps it out of properties", () => {
      const features = featuresOf([monumentRow({ item: "Q1", coordinate: [46.6, 39.3] })]);

      expect(features[0].geometry).toEqual({ type: "Point", coordinates: [46.6, 39.3] });
      expect(features[0].properties).not.toHaveProperty("coordinate");
   });

   it("stores geometry: null for rows without a coordinate (GeoJSON spec)", () => {
      const features = featuresOf([monumentRow({ item: "Q1", inventory: "4712" })]);

      expect(features[0].geometry).toBeNull();
   });

   it("ignores non-point WKT and keeps other literals as properties", () => {
      const features = featuresOf([
         monumentRow({
            item: "Q1",
            coordinate: [46.6, 39.3],
            extra: { image: text("x.jpg") },
         }),
      ]);

      expect(features[0].properties.image).toBe("x.jpg");
   });
});

describe("transformToGeoJSON — properties", () => {
   it("splits and numerically sorts the inventory list", () => {
      const features = featuresOf([monumentRow({ item: "Q1", inventory: "10\t2" })]);

      expect(features[0].properties.inventory).toEqual(["2", "10"]);
   });

   it("drops the inventory key entirely when no register number is present", () => {
      const features = featuresOf([monumentRow({ item: "Q1", inventory: "\t \t" })]);

      expect(features[0].properties).not.toHaveProperty("inventory");
   });

   it("writes property keys in sorted order for byte-stable change detection", () => {
      const features = featuresOf([
         monumentRow({ item: "Q1", inventory: "4712", extra: { azLink: text("https://az") } }),
      ]);

      const keys = Object.keys(features[0].properties);
      expect(keys).toEqual([...keys].sort());
   });
});

describe("transformToGeoJSON — ordering", () => {
   it("sorts features by canonical id with numeric-aware comparison", () => {
      const features = featuresOf([
         monumentRow({ item: "Q1", inventory: "10" }),
         monumentRow({ item: "Q2", inventory: "2" }),
      ]);

      expect(features.map((f) => f.properties.inventory?.[0])).toEqual(["2", "10"]);
   });

   it("breaks canonical-id ties on the Q-ID, keeping both conflicting rows", () => {
      const features = featuresOf([
         monumentRow({ item: "Q2", inventory: "66" }),
         monumentRow({ item: "Q1", inventory: "66" }),
      ]);

      expect(features).toHaveLength(2);
      expect(features.map((f) => f.properties.item)).toEqual([
         "http://www.wikidata.org/entity/Q1",
         "http://www.wikidata.org/entity/Q2",
      ]);
   });
});

describe("transformToGeoJSON — duplicate rows", () => {
   it("merges two rows for the same monument, keeping the fresher lastModified", () => {
      const features = featuresOf([
         monumentRow({
            item: "Q1",
            inventory: "4712",
            lastModified: "2026-07-22T13:14:53Z",
            coordinate: [46.6, 39.3],
         }),
         monumentRow({
            item: "Q1",
            inventory: "4712",
            lastModified: "2026-07-23T15:59:55Z",
            extra: { image: text("x.jpg") },
         }),
      ]);

      expect(features).toHaveLength(1);
      expect(features[0].properties.lastModified).toBe("2026-07-23T15:59:55Z");
      // Backfilled from the older row: the winner lacked both.
      expect(features[0].properties.image).toBe("x.jpg");
      expect(features[0].geometry).toEqual({ type: "Point", coordinates: [46.6, 39.3] });
      expect(console.log).toHaveBeenCalledWith("Merged 1 duplicate monument row(s): 4712.");
   });

   it("reports the duplicate bookkeeping alongside the data", () => {
      const result = transformToGeoJSON([
         monumentRow({ item: "Q1", inventory: "66", lastModified: "2026-07-22T13:14:53Z" }),
         monumentRow({ item: "Q1", inventory: "66", lastModified: "2026-07-23T15:59:55Z" }),
         monumentRow({ item: "Q2", inventory: "66" }),
      ]);

      expect(result.data.type).toBe("FeatureCollection");
      expect(result.data.features).toHaveLength(2);
      expect(result.mergedDuplicates).toBe(1);
      expect(result.conflictingDuplicates).toBe(1);
      expect(result.mergedIds).toEqual(["66"]);
      expect(result.conflictingIds).toEqual(["66"]);
   });

   it("keeps rows that share a register number but not the item, and warns", () => {
      const features = featuresOf([
         monumentRow({ item: "Q1", inventory: "66", label: "Qala divarları" }),
         monumentRow({ item: "Q2", inventory: "66", label: "Qoşa qala qapıları" }),
         monumentRow({ item: "Q3", inventory: "26—1031" }),
         monumentRow({ item: "Q4", inventory: "26—1031" }),
      ]);

      expect(features).toHaveLength(4);
      // The counter tracks the extra conflicting rows kept alongside each first,
      // and the warning names the register number and the items claiming it.
      expect(console.warn).toHaveBeenCalledWith(
         expect.stringContaining("2 row(s) share a register number with a different item"),
      );
      expect(console.warn).toHaveBeenCalledWith(
         expect.stringContaining("66 (Q1, Q2); 26—1031 (Q3, Q4)"),
      );
   });

   it("falls back to the Q-ID as dedupe key when a row has no inventory", () => {
      const result = transformToGeoJSON([
         monumentRow({ item: "Q1", lastModified: "2026-07-22T13:14:53Z" }),
         monumentRow({ item: "Q1", lastModified: "2026-07-23T15:59:55Z" }),
      ]);

      expect(result.data.features).toHaveLength(1);
      expect(result.data.features[0].properties.lastModified).toBe("2026-07-23T15:59:55Z");
      // With no register number the merge is reported under the short Q-ID.
      expect(result.mergedIds).toEqual(["Q1"]);
   });

   it("leaves distinct monuments untouched", () => {
      const features = featuresOf([
         monumentRow({ item: "Q1", inventory: "1" }),
         monumentRow({ item: "Q2", inventory: "2" }),
      ]);

      expect(features).toHaveLength(2);
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
   });
});

describe("mergeDuplicateRows", () => {
   const feature = (
      properties: Record<string, string | string[]>,
      geometry: GeoJSONFeature["geometry"] = null,
   ): GeoJSONFeature => ({ type: "Feature", geometry, properties });

   it("keeps the older row's geometry when the winner has none", () => {
      const merged = mergeDuplicateRows(
         feature({ lastModified: "2026-07-23T15:59:55Z", item: "Q1" }),
         feature(
            { lastModified: "2026-07-22T13:14:53Z", item: "Q1" },
            { type: "Point", coordinates: [46.6, 39.3] },
         ),
      );

      expect(merged.geometry).toEqual({ type: "Point", coordinates: [46.6, 39.3] });
      expect(merged.properties.lastModified).toBe("2026-07-23T15:59:55Z");
   });

   it("does not overwrite a non-empty field with the other row's value", () => {
      const merged = mergeDuplicateRows(
         feature({ lastModified: "2026-07-23T15:59:55Z", image: "a.jpg", item: "Q1" }),
         feature({ lastModified: "2026-07-22T13:14:53Z", image: "b.jpg", item: "Q1" }),
      );

      expect(merged.properties.image).toBe("a.jpg");
   });
});
