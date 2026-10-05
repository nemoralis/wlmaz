import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import { activeSortKey, sortDirectionFor, sortMonumentsByKey } from "@/utils/monumentSorting.ts";

const monument = (id: string, extra: Partial<MonumentProps> = {}): MonumentProps =>
   ({ inventory: [id], itemLabel: `Abidə ${id}`, ...extra }) as MonumentProps;

const ids = (list: MonumentProps[]): string[] => list.map((m) => m.inventory?.[0] ?? "");

describe("sortMonumentsByKey", () => {
   const data = [monument("857"), monument("1945"), monument("100"), monument("23")];

   it("orders inventory numerically, not lexicographically", () => {
      // Lexicographically "1945" < "23" < "857" < "100", which is the bug this
      // exists to prevent: register numbers are numbers.
      expect(ids(sortMonumentsByKey(data, "inventory", "asc"))).toEqual([
         "23",
         "100",
         "857",
         "1945",
      ]);
   });

   it("reverses on descending", () => {
      expect(ids(sortMonumentsByKey(data, "inventory", "desc"))).toEqual([
         "1945",
         "857",
         "100",
         "23",
      ]);
   });

   it("never mutates the input array", () => {
      const source = [...data];
      const before = ids(source);
      const sorted = sortMonumentsByKey(source, "inventory", "desc");
      expect(ids(source)).toEqual(before);
      expect(sorted).not.toBe(source);
   });

   it("returns a copy in the original order when there is no key", () => {
      const sorted = sortMonumentsByKey(data, undefined);
      expect(ids(sorted)).toEqual(before());
      expect(sorted).not.toBe(data);
   });

   it("falls back to a string order when either id has no digits", () => {
      // A single non-numeric id must not make the whole column string-ordered,
      // so only that pair is compared as text.
      const mixed = [monument("10"), monument("N-12"), monument("9")];
      expect(ids(sortMonumentsByKey(mixed, "inventory", "asc"))).toEqual(["9", "10", "N-12"]);
   });

   it("sorts any other key by its string value", () => {
      const named = [
         monument("1", { itemLabel: "Üçməqzə" }),
         monument("2", { itemLabel: "Ağdam" }),
         monument("3", { itemLabel: "Ordubad" }),
      ];
      expect(sortMonumentsByKey(named, "itemLabel", "asc").map((m) => m.itemLabel)).toEqual([
         "Ağdam",
         "Ordubad",
         "Üçməqzə",
      ]);
   });

   it("sorts by the column the visitor clicked, not a hardcoded one", () => {
      // The regression that started this: RegionPage read sortState.inventory
      // unconditionally, so sorting by "Ad" moved the chevron and nothing else.
      const named = [monument("1", { itemLabel: "B" }), monument("2", { itemLabel: "A" })];

      expect(sortMonumentsByKey(named, "itemLabel", "asc").map((m) => m.itemLabel)).toEqual([
         "A",
         "B",
      ]);
      expect(ids(sortMonumentsByKey(named, "inventory", "asc"))).toEqual(["1", "2"]);
   });

   it("sorts array-valued columns on the same joined text it displays", () => {
      const multi = [
         monument("1", { inventory: ["5", "7"] }),
         monument("2", { inventory: ["2", "9"] }),
      ];
      // Joined as "5, 7" and "2, 9", matching getColumnValue's display join, so
      // the order is the order those texts appear in the cells.
      expect(
         sortMonumentsByKey(multi, "inventory", "asc").map((m) => m.inventory?.join(", ")),
      ).toEqual(["2, 9", "5, 7"]);
   });

   it("sorts by the first inventory id when a monument has several", () => {
      // Ordered on the canonical (first) id: 30 after 3, not "30" before "3".
      const multi = [
         monument("a", { inventory: ["30", "9"] }),
         monument("b", { inventory: ["3"] }),
      ];
      expect(sortMonumentsByKey(multi, "inventory", "asc").map((m) => m.inventory?.[0])).toEqual([
         "3",
         "30",
      ]);
   });

   it("treats a missing value as an empty string", () => {
      const sparse = [
         monument("1", { addressLabel: undefined }),
         monument("2", { addressLabel: "Bakı" }),
         monument("3", { addressLabel: "" }),
      ];
      const sorted = sortMonumentsByKey(sparse, "addressLabel", "asc");
      expect(ids(sorted)).toEqual(["1", "3", "2"]);
   });

   it("is stable for equal keys, keeping the source order", () => {
      const tied = [
         monument("1", { itemLabel: "Eyni" }),
         monument("2", { itemLabel: "Eyni" }),
         monument("3", { itemLabel: "Eyni" }),
      ];
      expect(ids(sortMonumentsByKey(tied, "itemLabel", "asc"))).toEqual(["1", "2", "3"]);
   });

   it("keeps extra fields on the record", () => {
      const tagged = [monument("1", { lat: 40.1 }), monument("2", { lat: 39.9 })];
      const sorted = sortMonumentsByKey(tagged, "inventory", "desc");
      expect(sorted[0]?.lat).toBe(39.9);
      expect(sorted[0]?.itemLabel).toBe("Abidə 2");
   });

   it("handles an empty list", () => {
      expect(sortMonumentsByKey([], "inventory", "asc")).toEqual([]);
   });

   it("leaves equal numeric ids in source order", () => {
      // Two register numbers that parse to the same value must not be reordered.
      const same = [monument("1.0"), monument("1.00")];
      expect(ids(sortMonumentsByKey(same, "inventory", "asc"))).toEqual(["1.0", "1.00"]);
   });

   function before(): string[] {
      return ["857", "1945", "100", "23"];
   }
});

describe("activeSortKey and sortDirectionFor", () => {
   it("reads the single sorted column", () => {
      expect(activeSortKey({ inventory: "asc" })).toBe("inventory");
      expect(activeSortKey({ itemLabel: "desc" })).toBe("itemLabel");
   });

   it("reports no key for an empty state", () => {
      expect(activeSortKey({})).toBeUndefined();
      expect(sortDirectionFor({}, undefined)).toBe("asc");
   });

   it("reads the direction, defaulting to ascending", () => {
      expect(sortDirectionFor({ inventory: "desc" }, "inventory")).toBe("desc");
      expect(sortDirectionFor({ inventory: "asc" }, "inventory")).toBe("asc");
      // A key with no entry of its own cannot be read as "desc".
      expect(sortDirectionFor({ itemLabel: "desc" }, "inventory")).toBe("asc");
   });
});
