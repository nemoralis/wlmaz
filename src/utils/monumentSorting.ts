/**
 * Sorting for the monument tables.
 *
 * Extracted because two pages now show the same table — `/table` and
 * `/region/<name>` — and a per-page sort is how they drift apart. `RegionPage`
 * originally read `sortState.value.inventory` unconditionally, so clicking the
 * sortable "Ad" header moved the chevron without changing the row order.
 * Key-driven sorting removes that whole class of bug: the header the visitor
 * clicks names the key that is actually compared.
 */

import type { MonumentProps } from "@/types";
import { getCanonicalId } from "./monumentFormatters";

/** Pre-compiled once: this runs per comparison over every visible row. */
const INVENTORY_NUM_REGEX = /[^0-9.]/g;

/** Directory under which the two tables keep their sort state. */
export type SortDirection = "asc" | "desc";

/** The single active column. One column at a time, as the tables have always done. */
export const activeSortKey = (sortState: Record<string, SortDirection>): string | undefined =>
   Object.keys(sortState)[0];

/**
 * The direction for a key, defaulting to ascending.
 *
 * A `sortState` entry is absent until its header is clicked, so an absent key
 * has to read as "ascending" rather than as `undefined` reaching a comparison.
 */
export const sortDirectionFor = (
   sortState: Record<string, SortDirection>,
   key: string | undefined,
): SortDirection => (key && sortState[key] === "desc" ? "desc" : "asc");

/**
 * A cell's comparable value.
 *
 * Array-valued columns (every `inventory`, which is `string[]`) are joined rather
 * than left to `Array.prototype.toString`: `toString` happens to produce the same
 * comma-joined string today, but relying on that ties the sort to an implicit
 * coercion instead of stating it, and `getColumnValue` in `MonumentVirtualTable`
 * already joins for display. Sorting and displaying now use one rule, so the
 * order a visitor sees matches the order they sorted by.
 */
const comparableValue = (record: MonumentProps, key: string): string => {
   const value = (record as Record<string, unknown>)[key];
   if (typeof value === "string") return value;
   if (typeof value === "number") return String(value);
   if (Array.isArray(value)) return value.filter((v) => v != null).join(", ");
   return "";
};

/**
 * The numeric part of a monument's canonical inventory id, or `NaN` when it has
 * none. Register ids are mixed ("857", "1945", "N-12"), so one monument without
 * digits must not collapse the whole column to string order.
 */
const inventoryNumber = (monument: MonumentProps): number =>
   parseFloat(getCanonicalId(monument.inventory).replace(INVENTORY_NUM_REGEX, ""));

/**
 * Sorts monuments by one column.
 *
 * Returns a new array; the input is never mutated, so a caller's cached array
 * stays intact. With no key the result is a copy in the original order.
 *
 * Inventory compares numerically where both ids carry digits, so "1945" sorts
 * after "857" instead of before it. Ids without digits fall back to a string
 * comparison rather than poisoning the column with `NaN`.
 */
export const sortMonumentsByKey = <T extends MonumentProps>(
   data: readonly T[],
   sortKey: string | undefined,
   sortDirection: SortDirection = "asc",
): T[] => {
   const result = [...data];
   if (!sortKey) return result;

   const order = sortDirection === "desc" ? -1 : 1;

   return result.sort((a, b) => {
      if (sortKey === "inventory") {
         const numA = inventoryNumber(a);
         const numB = inventoryNumber(b);
         if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
            return (numA - numB) * order;
         }
      }

      const valueA = comparableValue(a, sortKey);
      const valueB = comparableValue(b, sortKey);
      if (valueA < valueB) return -order;
      if (valueA > valueB) return order;
      return 0;
   });
};
