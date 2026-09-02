import { describe, expect, it } from "vitest";
import { nextFreeTitles, titleForNumber } from "../uploadFileNames";

const noneExisting = async (_candidates: string[]): Promise<Set<string>> => new Set();

const existing =
   (...titles: string[]) =>
   async (candidates: string[]): Promise<Set<string>> => {
      const taken = new Set(titles);
      return new Set(candidates.filter((c) => taken.has(c)));
   };

describe("titleForNumber", () => {
   it("joins base and number", () => {
      expect(titleForNumber("Monument", 1)).toBe("Monument 1");
   });

   it("trims trailing whitespace in base", () => {
      expect(titleForNumber("Monument ", 2)).toBe("Monument 2");
   });
});

describe("nextFreeTitles", () => {
   it("returns sequential numbers when none exist", async () => {
      const titles = await nextFreeTitles("Monument", 3, noneExisting);
      expect(titles).toEqual(["Monument 1", "Monument 2", "Monument 3"]);
   });

   it("skips existing leading numbers and starts at the first free slot", async () => {
      const titles = await nextFreeTitles("Monument", 2, existing("Monument 1", "Monument 2"));
      expect(titles).toEqual(["Monument 3", "Monument 4"]);
   });

   it("fills gaps left by existing numbers", async () => {
      const titles = await nextFreeTitles("Monument", 2, existing("Monument 1", "Monument 3"));
      expect(titles).toEqual(["Monument 2", "Monument 4"]);
   });

   it("returns exactly count titles even when all of a batch is taken", async () => {
      const taken = Array.from({ length: 50 }, (_, i) => `Monument ${i + 1}`);
      const titles = await nextFreeTitles("Monument", 3, existing(...taken));
      expect(titles).toEqual(["Monument 51", "Monument 52", "Monument 53"]);
   });

   it("never yields duplicate titles", async () => {
      const titles = await nextFreeTitles("Monument", 4, existing("Monument 2", "Monument 4"));
      expect(new Set(titles).size).toBe(titles.length);
      expect(titles).toEqual(["Monument 1", "Monument 3", "Monument 5", "Monument 6"]);
   });

   it("returns zero titles when count is zero", async () => {
      const titles = await nextFreeTitles("Monument", 0, noneExisting);
      expect(titles).toEqual([]);
   });

   it("throws after exhausting MAX_TITLES_TO_CHECK candidates", async () => {
      const allTaken = async (candidates: string[]): Promise<Set<string>> => new Set(candidates);

      await expect(nextFreeTitles("Monument", 3, allTaken)).rejects.toThrow(
         /Could not find 3 free titles for "Monument"/,
      );
   });
});