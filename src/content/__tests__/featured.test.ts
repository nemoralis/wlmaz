import { describe, expect, it, vi } from "vitest";
import { DEFAULT_REGION_LIMIT, resolveHomeData, type HomeFeature } from "@/content/featured.ts";

const feature = (
   inventory: string,
   {
      coordinates = [49.8, 40.4] as [number, number] | null,
      image = "http://commons.wikimedia.org/wiki/Special:FilePath/A.jpg",
      label = "Abidə",
      parentLabel = "Bakı",
   }: {
      coordinates?: [number, number] | null;
      image?: string | null;
      label?: string;
      parentLabel?: string;
   } = {},
): HomeFeature => ({
   geometry: coordinates ? { type: "Point", coordinates } : null,
   properties: {
      inventory,
      itemLabel: label,
      parentLabel,
      ...(image === null ? {} : { image }),
   },
});

describe("resolveHomeData", () => {
   it("counts located features and honours the curated id order", () => {
      const data = resolveHomeData(
         [feature("20", { label: "Şəki xan sarayı" }), feature("10", { label: "Monastır" })],
         ["10", "20"],
      );

      expect(data.featured.map((m) => m.inventory)).toEqual(["10", "20"]);
      expect(data.total).toBe(2);
      expect(data.withImage).toBe(2);
   });

   it("excludes coordinate-less features from both the collage and the counts", () => {
      const data = resolveHomeData(
         [feature("20"), feature("99", { coordinates: null }), feature("10")],
         ["20", "99"],
      );

      // Same rule as stats-history.json: only located monuments count, so the
      // hero number always matches what /stats reports.
      expect(data.total).toBe(2);
      expect(data.featured.map((m) => m.inventory)).toEqual(["20"]);
   });

   it("skips located features that have no photo", () => {
      const data = resolveHomeData([feature("20", { image: null }), feature("10")], ["20", "10"]);

      expect(data.featured.map((m) => m.inventory)).toEqual(["10"]);
      expect(data.total).toBe(2);
      expect(data.withImage).toBe(1);
   });

   it("resolves a monument by its canonical (first) inventory part only", () => {
      const data = resolveHomeData([feature("390, 5291")], ["390"]);

      expect(data.featured).toHaveLength(1);
      expect(resolveHomeData([feature("390, 5291")], ["5291"]).featured).toHaveLength(0);
   });

   it("builds a canonical, percent-encoded page url and https image url", () => {
      const [monument] = resolveHomeData(
         [feature("2.2", { label: "Qız qalası" })],
         ["2.2"],
      ).featured;

      expect(monument.url).toBe("/monument/2%2E2");
      expect(monument.image).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/A.jpg");
   });

   it("falls back to a generic label when Wikidata has none", () => {
      const [monument] = resolveHomeData([feature("20", { label: "" })], ["20"]).featured;

      expect(monument.label).toBe("Abidə");
   });

   it("throws in strict mode so a bad curated id fails the build", () => {
      expect(() => resolveHomeData([feature("20")], ["nope"], { strict: true })).toThrow(
         /featured monument "nope" not found/,
      );
      expect(() =>
         resolveHomeData([feature("20", { image: null })], ["20"], { strict: true }),
      ).toThrow(/has no photo/);
      expect(() =>
         resolveHomeData([feature("20", { coordinates: null })], ["20"], { strict: true }),
      ).toThrow(/not found among located features/);
   });

   it("warns and skips instead of throwing when non-strict", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const data = resolveHomeData([feature("20")], ["nope", "20"], { strict: false });

      expect(data.featured.map((m) => m.inventory)).toEqual(["20"]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('"nope"');
      warn.mockRestore();
   });

   it("renders nothing but the counts when no featured ids are given", () => {
      const data = resolveHomeData([feature("20")], []);

      expect(data.featured).toEqual([]);
      expect(data.total).toBe(1);
   });

   describe("regions", () => {
      it("ranks regions by monument count and splits out the photographed ones", () => {
         const data = resolveHomeData(
            [
               feature("1", { parentLabel: "Bakı" }),
               feature("2", { parentLabel: "Bakı", image: null }),
               feature("3", { parentLabel: "Şəki" }),
               feature("4", { parentLabel: "Gəncə" }),
               feature("5", { parentLabel: "Quba", image: null }),
            ],
            [],
         );

         expect(data.regions).toEqual([
            { label: "Bakı", count: 2, withImage: 1 },
            { label: "Gəncə", count: 1, withImage: 1 },
            { label: "Quba", count: 1, withImage: 0 },
            { label: "Şəki", count: 1, withImage: 1 },
         ]);
      });

      it("breaks count ties alphabetically so rebuilds stay byte-stable", () => {
         const regions = (labels: string[]) =>
            resolveHomeData(
               labels.map((parentLabel, index) => feature(String(index), { parentLabel })),
               [],
            ).regions;

         // Same multiset, opposite input order — the ranking must not depend on it.
         expect(regions(["Zaqa rayonu", "Bakı", "Ağstafa rayonu"])).toEqual(
            regions(["Ağstafa rayonu", "Zaqa rayonu", "Bakı"]),
         );
      });

      it("caps the grid and honours an explicit limit", () => {
         const many = Array.from({ length: 30 }, (_, index) =>
            feature(String(index), { parentLabel: `R${index}` }),
         );

         expect(resolveHomeData(many, []).regions).toHaveLength(DEFAULT_REGION_LIMIT);
         expect(resolveHomeData(many, [], { regionLimit: 4 }).regions).toHaveLength(4);
      });

      it("skips coordinate-less features and features with no region label", () => {
         const data = resolveHomeData(
            [
               feature("1", { parentLabel: "Bakı" }),
               feature("2", { parentLabel: "Bakı", coordinates: null }),
               feature("3", { parentLabel: "" }),
            ],
            [],
         );

         expect(data.total).toBe(2);
         expect(data.regions).toEqual([{ label: "Bakı", count: 1, withImage: 1 }]);
      });
   });
});
