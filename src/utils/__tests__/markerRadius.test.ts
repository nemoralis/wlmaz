import { describe, expect, it } from "vitest";
import { getMarkerRadius, HIGHLIGHT_RADIUS_OFFSET } from "../markerRadius";

describe("getMarkerRadius", () => {
   it("returns 6px at the default zoom 7", () => {
      expect(getMarkerRadius(7)).toBe(6);
   });

   it("grows with zoom", () => {
      expect(getMarkerRadius(8)).toBe(7);
      expect(getMarkerRadius(9)).toBe(8);
   });

   it("caps at 8px for high zooms", () => {
      expect(getMarkerRadius(10)).toBe(8);
      expect(getMarkerRadius(16)).toBe(8);
   });

   it("floors at 3px for low zooms", () => {
      expect(getMarkerRadius(4)).toBe(3);
      expect(getMarkerRadius(2)).toBe(3);
   });
});

describe("HIGHLIGHT_RADIUS_OFFSET", () => {
   it("is a positive offset", () => {
      expect(HIGHLIGHT_RADIUS_OFFSET).toBe(2);
   });
});
