import { getCanonicalId } from "../../src/utils/monumentFormatters";
import type { SparqlBinding } from "./sparqlClient";

/**
 * SPARQL row -> GeoJSON feature transformation.
 *
 * Everything here is pure (no I/O) so the data pipeline's core logic can be
 * unit-tested; the orchestration lives in scripts/update-monuments.ts.
 */

// Separator used to concatenate heritage IDs in the SPARQL query; kept in sync
// with the SEPARATOR in scripts/queries/monuments.rq.
export const INVENTORY_SEPARATOR = "\t";

/** GeoJSON properties: SPARQL literals, except `inventory` which is a list of ids. */
export interface GeoProperties {
   [key: string]: string | string[];
}

export interface GeoJSONFeature {
   type: "Feature";
   geometry: { type: "Point"; coordinates: [number, number] } | null;
   properties: GeoProperties;
}

export interface GeoJSON {
   type: "FeatureCollection";
   features: GeoJSONFeature[];
}

/** Narrows an index-signature property to its (always string) scalar form. */
const asText = (value: string | string[] | undefined): string =>
   typeof value === "string" ? value : "";

/** Splits the GROUP_CONCAT'ed heritage ids back into a list of register numbers. */
export const splitInventoryGroups = (value: string | string[] | undefined): string[] =>
   (Array.isArray(value) ? value : (value || "").split(INVENTORY_SEPARATOR))
      .map((id) => id.trim())
      .filter(Boolean);

/**
 * Collapses two rows that describe the same monument, keeping the row with the
 * fresher `lastModified` and backfilling anything it lacks from the other.
 */
export const mergeDuplicateRows = (a: GeoJSONFeature, b: GeoJSONFeature): GeoJSONFeature => {
   const base = asText(a.properties.lastModified) >= asText(b.properties.lastModified) ? a : b;
   const other = base === a ? b : a;

   const merged: GeoProperties = { ...base.properties };
   for (const key of Object.keys(other.properties)) {
      if (!(key in merged) || merged[key] === "") {
         merged[key] = other.properties[key];
      }
   }

   return {
      type: "Feature",
      geometry: base.geometry ?? other.geometry,
      // Re-sort so a merged row keeps the same key order the row builder writes.
      properties: Object.keys(merged)
         .sort()
         .reduce((obj, key) => {
            obj[key] = merged[key];
            return obj;
         }, {} as GeoProperties),
   };
};

/** Transform outcome: the data plus the duplicate bookkeeping the CLI reports. */
export interface TransformResult {
   data: GeoJSON;
   /** Rows collapsed into an existing feature (same monument, fresher stamp). */
   mergedDuplicates: number;
   /** Rows kept even though they share a register number with a different item. */
   conflictingDuplicates: number;
   /** Register numbers whose duplicate rows were merged, unique. */
   mergedIds: string[];
   /** Register numbers claimed by more than one item, unique. */
   conflictingIds: string[];
}

/** `http://www.wikidata.org/entity/Q42` -> `Q42`, for compact log lines. */
const shortQid = (uri: string): string => uri.slice(uri.lastIndexOf("/") + 1) || uri;

export function transformToGeoJSON(bindings: SparqlBinding[]): TransformResult {
   const features: GeoJSONFeature[] = [];

   for (const row of bindings) {
      const properties: GeoProperties = {};
      let coordinates: [number, number] | null = null;

      for (const rowVar in row) {
         const binding = row[rowVar];

         // Check for WKT literal (coordinates)
         if (
            binding.type === "literal" &&
            binding.datatype === "http://www.opengis.net/ont/geosparql#wktLiteral"
         ) {
            const match = binding.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
            if (match) {
               coordinates = [parseFloat(match[1]), parseFloat(match[2])];
            }
         } else {
            // Add other fields to properties
            properties[rowVar] = binding.value;
         }
      }

      // Add feature with or without coordinates (geometry: null per GeoJSON spec)
      const sortedProperties = Object.keys(properties)
         .sort()
         .reduce((obj, key) => {
            obj[key] = properties[key];
            return obj;
         }, {} as GeoProperties);

      // `inventory` arrives as one tab-concatenated GROUP_CONCAT string (see
      // scripts/queries/monuments.rq); a tab cannot occur inside a register
      // number, so the concatenation is unambiguous. Store it as a list, sorted
      // first because SPARQL makes no ordering promise and the first id is the
      // canonical one the monument page is published under.
      const inventoryIds = splitInventoryGroups(sortedProperties.inventory).sort((a, b) =>
         a.localeCompare(b, undefined, { numeric: true }),
      );
      if (inventoryIds.length) {
         sortedProperties.inventory = inventoryIds;
      } else {
         delete sortedProperties.inventory;
      }

      features.push({
         type: "Feature",
         geometry: coordinates
            ? {
                 type: "Point",
                 coordinates: coordinates,
              }
            : null,
         properties: sortedProperties,
      });
   }

   // `monuments.rq` groups by `?item ?inventory ?lastModified`, so an item
   // carrying more than one `schema:dateModified` statement comes back once per
   // value — the same monument arriving twice, identical apart from that stamp.
   // Those collapse into one feature, keyed on the canonical register number
   // (the id the monument page is published under; falling back to the Q-ID
   // when there is no inventory).
   //
   // Rows sharing a register number but not the item are two different
   // monuments claiming one page. They are deliberately left in place: the
   // duplicate `<loc>` they produce fails verify-prerender, which is louder and
   // safer than silently picking a winner here.
   const deduped: GeoJSONFeature[] = [];
   const indexByKey = new Map<string, number>();
   const mergedIds: string[] = [];
   // Register number -> the Q-IDs claiming it, so the warning can name names.
   const conflictsById = new Map<string, Set<string>>();
   let mergedDuplicates = 0;
   let conflictingDuplicates = 0;

   for (const feature of features) {
      const canonicalId = getCanonicalId(feature.properties.inventory);
      const key = canonicalId || asText(feature.properties.item);
      const keptIndex = key ? indexByKey.get(key) : undefined;

      if (keptIndex === undefined) {
         if (key) indexByKey.set(key, deduped.length);
         deduped.push(feature);
         continue;
      }

      const kept = deduped[keptIndex];
      if (asText(kept.properties.item) !== asText(feature.properties.item)) {
         conflictingDuplicates++;
         const claimants = conflictsById.get(key) ?? new Set<string>();
         claimants.add(shortQid(asText(kept.properties.item)));
         claimants.add(shortQid(asText(feature.properties.item)));
         conflictsById.set(key, claimants);
         deduped.push(feature);
         continue;
      }

      deduped[keptIndex] = mergeDuplicateRows(kept, feature);
      mergedDuplicates++;
      mergedIds.push(canonicalId || shortQid(asText(feature.properties.item)));
   }

   if (mergedDuplicates) {
      console.log(
         `Merged ${mergedDuplicates} duplicate monument row(s): ${[...new Set(mergedIds)].join(", ")}.`,
      );
   }
   if (conflictsById.size) {
      const detail = [...conflictsById]
         .map(([id, items]) => `${id} (${[...items].join(", ")})`)
         .join("; ");
      console.warn(
         `${conflictingDuplicates} row(s) share a register number with a different item — left as-is so verify-prerender fails loudly: ${detail}`,
      );
   }

   // Sort by canonical inventory number, with the Q-ID as a deterministic tiebreaker
   deduped.sort((a, b) => {
      const invA = getCanonicalId(a.properties.inventory);
      const invB = getCanonicalId(b.properties.inventory);
      const cmp = invA.localeCompare(invB, undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return asText(a.properties.item).localeCompare(asText(b.properties.item));
   });

   return {
      data: {
         type: "FeatureCollection",
         features: deduped,
      },
      mergedDuplicates,
      conflictingDuplicates,
      mergedIds: [...new Set(mergedIds)],
      conflictingIds: [...conflictsById.keys()],
   };
}
