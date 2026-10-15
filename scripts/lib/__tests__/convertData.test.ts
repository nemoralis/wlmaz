import { decode } from "geobuf";
import { PbfReader as Pbf } from "pbf";
import { describe, expect, it } from "vitest";
import { encodeGeobuf } from "../convertData";

describe("encodeGeobuf", () => {
   it("round-trips a monument-shaped FeatureCollection", () => {
      // Typed loosely: `geometry: null` (coord-less monuments) is valid GeoJSON
      // and valid for this pipeline, but @types/geojson models Feature.geometry
      // as non-nullable — the test asserts the null actually survives.
      const geojson = {
         type: "FeatureCollection",
         features: [
            {
               type: "Feature",
               // geobuf stores coordinates at 1e-6 precision, so this is the
               // exact value the round trip can preserve.
               geometry: { type: "Point", coordinates: [46.634642, 39.302825] },
               properties: {
                  itemLabel: "Məscid",
                  inventory: ["4712", "4712A"],
                  item: "http://www.wikidata.org/entity/Q140665585",
               },
            },
            { type: "Feature", geometry: null, properties: { itemLabel: "Abidə" } },
         ],
      };

      const decoded = decode(
         new Pbf(encodeGeobuf(geojson as Parameters<typeof encodeGeobuf>[0])),
      ) as typeof geojson;

      expect(decoded.type).toBe("FeatureCollection");
      expect(decoded.features).toHaveLength(2);
      expect(decoded.features[0].geometry).toEqual(geojson.features[0].geometry);
      expect(decoded.features[0].properties).toEqual(geojson.features[0].properties);
      // geometry: null survives the round trip — coord-less monuments must not
      // gain a fake point on the way to the map.
      expect(decoded.features[1].geometry).toBeNull();
   });
});
