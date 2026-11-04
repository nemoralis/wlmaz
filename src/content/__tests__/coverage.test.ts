import { describe, expect, it } from "vitest";
import { resolveCoverage, type CoverageFeature } from "@/content/coverage.ts";

const feature = ({
   located = true,
   image = "https://commons.wikimedia.org/wiki/Special:FilePath/A.jpg",
}: { located?: boolean; image?: string | null } = {}): CoverageFeature => ({
   geometry: located ? { type: "Point", coordinates: [49.8, 40.4] } : null,
   properties: image === null ? {} : { image },
});

describe("resolveCoverage", () => {
   it("counts located features and the ones with a photo", () => {
      const data = resolveCoverage([feature(), feature({ image: null }), feature()]);

      expect(data).toEqual({ total: 3, withImage: 2 });
   });

   it("excludes coordinate-less features from both counts", () => {
      const data = resolveCoverage([
         feature(),
         feature({ located: false }),
         feature({ located: false, image: null }),
      ]);

      expect(data).toEqual({ total: 1, withImage: 1 });
   });

   it("returns zeroes for an empty feature set", () => {
      expect(resolveCoverage([])).toEqual({ total: 0, withImage: 0 });
   });
});
