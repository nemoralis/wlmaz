import { describe, expect, it } from "vitest";
import { getOverlapGroupKey, getSpreadPosition } from "../markerOverlap";

describe("getOverlapGroupKey", () => {
   it("groups identical coordinates", () => {
      expect(getOverlapGroupKey(40.3667809, 49.8372999)).toBe(
         getOverlapGroupKey(40.3667809, 49.8372999),
      );
   });

   it("groups near-duplicate coordinates within ~11 m", () => {
      expect(getOverlapGroupKey(40.366781, 49.8373)).toBe(
         getOverlapGroupKey(40.3667809, 49.8372999),
      );
   });

   it("does not group distant coordinates", () => {
      expect(getOverlapGroupKey(40.3667, 49.8373)).not.toBe(getOverlapGroupKey(40.3668, 49.8373));
   });
});

describe("getSpreadPosition", () => {
   it("keeps the anchor member at the true position", () => {
      expect(getSpreadPosition(40.3668, 49.8373, 0, 2)).toEqual({ lat: 40.3668, lng: 49.8373 });
   });

   it("keeps single markers at the true position", () => {
      expect(getSpreadPosition(40.3668, 49.8373, 1, 1)).toEqual({ lat: 40.3668, lng: 49.8373 });
   });

   it("moves subsequent members off the anchor", () => {
      const first = getSpreadPosition(40.3668, 49.8373, 1, 2);
      expect(first).not.toEqual({ lat: 40.3668, lng: 49.8373 });
   });

   it("spreads members apart from each other", () => {
      const positions = [0, 1, 2, 3].map((i) => getSpreadPosition(40.3668, 49.8373, i, 4));
      const keys = new Set(positions.map((p) => `${p.lat.toFixed(8)},${p.lng.toFixed(8)}`));
      expect(keys.size).toBe(4);
   });

   it("is deterministic for a given index and group size", () => {
      const a = getSpreadPosition(40.3668, 49.8373, 2, 5);
      const b = getSpreadPosition(40.3668, 49.8373, 2, 5);
      expect(a).toEqual(b);
   });
});
