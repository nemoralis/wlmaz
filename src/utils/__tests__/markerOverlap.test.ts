import { describe, expect, it } from "vitest";
import { getOverlapGroupKey, getSpreadPosition } from "@/utils/markerOverlap.ts";

/**
 * Converts a lat/lng delta into screen pixels at a given zoom using the
 * Web Mercator inverse, so expectations can be stated in pixels — the
 * quantity getSpreadPosition actually works in.
 */
const pixelOffset = (
   pos: { lat: number; lng: number },
   anchor: { lat: number; lng: number },
   zoom: number,
) => {
   const worldSize = 256 * 2 ** zoom;
   const cosLat = Math.cos((anchor.lat * Math.PI) / 180);
   return {
      x: ((pos.lng - anchor.lng) * worldSize) / 360,
      y: ((pos.lat - anchor.lat) * worldSize) / (360 * cosLat),
   };
};

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
   const anchor = { lat: 40.3668, lng: 49.8373 };

   it("keeps the anchor member at the true position", () => {
      expect(getSpreadPosition(anchor.lat, anchor.lng, 0, 4, 7, 14)).toEqual(anchor);
   });

   it("keeps single markers at the true position", () => {
      expect(getSpreadPosition(anchor.lat, anchor.lng, 1, 1, 7, 14)).toEqual(anchor);
   });

   it("moves subsequent members off the anchor", () => {
      expect(getSpreadPosition(anchor.lat, anchor.lng, 1, 2, 7, 14)).not.toEqual(anchor);
   });

   it("spreads members apart from each other", () => {
      const positions = [0, 1, 2, 3].map((i) =>
         getSpreadPosition(anchor.lat, anchor.lng, i, 4, 7, 14),
      );
      const keys = new Set(positions.map((p) => `${p.lat.toFixed(8)},${p.lng.toFixed(8)}`));
      expect(keys.size).toBe(4);
   });

   it("is deterministic for a given index and group size", () => {
      const a = getSpreadPosition(anchor.lat, anchor.lng, 2, 5, 7, 14);
      const b = getSpreadPosition(anchor.lat, anchor.lng, 2, 5, 7, 14);
      expect(a).toEqual(b);
   });

   it("places members one spacing away from the anchor, in pixels", () => {
      // Index 2 of 4 sits at 180°: a pure westward offset of exactly spacingPx.
      const pos = getSpreadPosition(anchor.lat, anchor.lng, 2, 4, 7, 14);
      const { x, y } = pixelOffset(pos, anchor, 7);
      expect(Math.abs(x)).toBeCloseTo(14, 6);
      expect(y).toBeCloseTo(0, 6);
   });

   it("keeps the on-screen ring size constant across zooms", () => {
      const low = getSpreadPosition(anchor.lat, anchor.lng, 1, 4, 7, 14);
      const high = getSpreadPosition(anchor.lat, anchor.lng, 1, 4, 14, 14);
      const lowPx = pixelOffset(low, anchor, 7);
      const highPx = pixelOffset(high, anchor, 14);
      expect(Math.hypot(lowPx.x, lowPx.y)).toBeCloseTo(Math.hypot(highPx.x, highPx.y), 6);
      // Same pixel offset means a smaller degree offset when zoomed in.
      expect(Math.abs(high.lat - anchor.lat)).toBeLessThan(Math.abs(low.lat - anchor.lat));
   });

   it("opens the ring up for large groups so neighbours keep their gap", () => {
      const spacing = 14;
      const size = 40;
      const positions = Array.from({ length: size }, (_, i) =>
         getSpreadPosition(anchor.lat, anchor.lng, i, size, 7, spacing),
      );
      // Minimum pairwise pixel distance should stay near the requested gap
      // instead of collapsing as the group grows.
      let min = Infinity;
      for (let i = 0; i < size; i++) {
         for (let j = i + 1; j < size; j++) {
            const a = pixelOffset(positions[i], anchor, 7);
            const b = pixelOffset(positions[j], anchor, 7);
            min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
         }
      }
      expect(min).toBeGreaterThan(spacing * 0.9);
   });
});
