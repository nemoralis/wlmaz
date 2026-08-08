import { describe, expect, it } from "vitest";
import { getCoordinatesUrl } from "../geoLinks";

describe("getCoordinatesUrl", () => {
   it("returns a geo: URI on mobile", () => {
      expect(getCoordinatesUrl(40.3668, 49.8373, true)).toBe("geo:40.3668,49.8373");
   });

   it("returns a Google Maps url on desktop", () => {
      expect(getCoordinatesUrl(40.3668, 49.8373, false)).toBe(
         "https://maps.google.com/?q=40.3668,49.8373",
      );
   });

   it("preserves fractional coordinates exactly", () => {
      expect(getCoordinatesUrl(40.409258, 49.867092, false)).toBe(
         "https://maps.google.com/?q=40.409258,49.867092",
      );
      expect(getCoordinatesUrl(40.409258, 49.867092, true)).toBe("geo:40.409258,49.867092");
   });
});
