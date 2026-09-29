import { readFileSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { encodeIdForUrl, getCanonicalId } from "../src/utils/monumentFormatters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "../public");
const DATA_DIR = path.join(__dirname, "../data");
const GEOJSON_PATH = path.join(DATA_DIR, "monuments.geojson");

// Separator used to concatenate heritage IDs in the SPARQL query; kept in sync
// with the SEPARATOR in scripts/queries/monuments.rq.
const INVENTORY_SEPARATOR = "\t";

// SPARQL Query to fetch monuments in Azerbaijan
const SPARQL_QUERY = readFileSync(path.join(__dirname, "queries", "monuments.rq"), "utf-8");

class SPARQLQueryDispatcher {
   endpoint: string;
   maxRetries: number;

   constructor(endpoint: string, maxRetries = 3) {
      this.endpoint = endpoint;
      this.maxRetries = maxRetries;
   }

   async query(sparqlQuery: string): Promise<SparqlResults> {
      const fullUrl = this.endpoint + "?query=" + encodeURIComponent(sparqlQuery);
      const headers = {
         Accept: "application/sparql-results+json",
         "User-Agent": "WLMAZ-Updater/1.0 (https://gitlab.wikimedia.org/nmw03/wlmaz)",
      };

      // Large result sets occasionally arrive truncated over the network; retry
      // the request a few times before giving up.
      for (let attempt = 1; ; attempt++) {
         const response = await fetch(fullUrl, { headers });
         if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
         }
         try {
            return await response.json();
         } catch (error) {
            if (attempt >= this.maxRetries) {
               throw error;
            }
            console.warn(
               `Response corrupted on attempt ${attempt}/${this.maxRetries}, retrying...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
         }
      }
   }
}

const endpointUrl = "https://query.wikidata.org/sparql";

interface SparqlValue {
   type: string;
   value: string;
   datatype?: string;
}

interface SparqlBinding {
   [key: string]: SparqlValue;
}

interface SparqlResults {
   results: {
      bindings: SparqlBinding[];
   };
}

/** GeoJSON properties: SPARQL literals, except `inventory` which is a list of ids. */
interface GeoProperties {
   [key: string]: string | string[];
}

/** Narrows an index-signature property to its (always string) scalar form. */
const asText = (value: string | string[] | undefined): string =>
   typeof value === "string" ? value : "";

/** Splits the GROUP_CONCAT'ed heritage ids back into a list of register numbers. */
const splitInventoryGroups = (value: string | string[] | undefined): string[] =>
   (Array.isArray(value) ? value : (value || "").split(INVENTORY_SEPARATOR))
      .map((id) => id.trim())
      .filter(Boolean);

interface GeoJSONFeature {
   type: "Feature";
   geometry: { type: "Point"; coordinates: [number, number] } | null;
   properties: GeoProperties;
}

interface GeoJSON {
   type: "FeatureCollection";
   features: GeoJSONFeature[];
}

/** A single daily stats-history entry written to stats-history.json. */
interface HistoryEntry {
   date: string;
   timestamp: number;
   total: number;
   withImage: number;
   withoutImage: number;
}

function transformToGeoJSON(bindings: SparqlBinding[]): GeoJSON {
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

   // Sort by canonical inventory number, with the Q-ID as a deterministic tiebreaker
   features.sort((a, b) => {
      const invA = getCanonicalId(a.properties.inventory);
      const invB = getCanonicalId(b.properties.inventory);
      const cmp = invA.localeCompare(invB, undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return asText(a.properties.item).localeCompare(asText(b.properties.item));
   });

   return {
      type: "FeatureCollection",
      features,
   };
}

async function main() {
   try {
      // 1. Load existing data
      let existingData: GeoJSON | null = null;
      try {
         const fileContent = await fs.readFile(GEOJSON_PATH, "utf-8");
         existingData = JSON.parse(fileContent);
      } catch {
         console.log("No existing GeoJSON found or invalid JSON.");
      }

      // 2. Fetch new data
      console.log("Fetching data from Wikidata...");
      const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
      const data = await queryDispatcher.query(SPARQL_QUERY);
      const bindings = data.results.bindings as SparqlBinding[];

      const newData = transformToGeoJSON(bindings);

      // 3. Check if data has actually changed
      if (existingData) {
         if (JSON.stringify(existingData) === JSON.stringify(newData)) {
            console.log("No changes detected. Skipping file update.");
            process.exit(0);
         }
         console.log(`Updated ${newData.features.length} monuments.`);
      } else {
         console.log(`Fetched ${newData.features.length} monuments.`);
      }

      // 4. Save new data
      await fs.writeFile(GEOJSON_PATH, JSON.stringify(newData, null, 4));
      console.log(`Saved updated GeoJSON to ${GEOJSON_PATH}`);

      // 5. Save History
      if (existingData) {
         const HISTORY_PATH = path.join(PUBLIC_DIR, "stats-history.json");
         let history: HistoryEntry[] = [];
         try {
            const content = await fs.readFile(HISTORY_PATH, "utf-8");
            history = JSON.parse(content) as HistoryEntry[];
         } catch {
            // Start new history
            console.log("Starting new history file.");
         }

         const today = new Date().toISOString().split("T")[0];
         // Count located (geometry-bearing) monuments only: coord-less
         // monuments are table-only and must not inflate the history.
         const locatedFeatures = newData.features.filter((f) => f.geometry);
         const withImage = locatedFeatures.filter((f) => f.properties.image).length;

         const entry = {
            date: today,
            timestamp: Date.now(),
            total: locatedFeatures.length,
            withImage,
            withoutImage: locatedFeatures.length - withImage,
         };

         // Remove existing entry for same date to allow re-runs
         history = history.filter((h) => h.date !== today);
         history.push(entry);

         // Sort by date
         history.sort((a, b) => a.timestamp - b.timestamp);

         await fs.writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
         console.log(`Saved update stats to ${HISTORY_PATH}`);

         // 6. Notify IndexNow
         await notifyIndexNow(existingData, newData);
      }
   } catch (error) {
      console.error("Error updating monuments:", error);
      process.exit(1);
   }
}

// IndexNow Configuration
const INDEXNOW_HOST = "wikilovesmonuments.az";
// The IndexNow key should come from the environment (CI secret) rather than
// being committed to the repository.
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

async function notifyIndexNow(oldData: GeoJSON, newData: GeoJSON) {
   console.log("--- IndexNow Notification ---");
   const changedUrls: string[] = [];
   // Keyed by canonical id: a monument's inventory is a list, so the array
   // itself is useless as a map key (and would differ by identity, not value).
   const oldMap = new Map(oldData.features.map((f) => [getCanonicalId(f.properties.inventory), f]));
   const forceIndex = process.argv.includes("--force-index");

   if (forceIndex) {
      console.log("Force index enabled: Submitting ALL monuments.");
   }

   // Find added and modified
   for (const feature of newData.features) {
      const inv = getCanonicalId(feature.properties.inventory);
      const oldFeature = oldMap.get(inv);

      const url = `https://${INDEXNOW_HOST}/monument/${encodeIdForUrl(inv)}`;

      if (forceIndex) {
         changedUrls.push(url);
      } else if (!oldFeature) {
         // Added
         changedUrls.push(url);
      } else if (JSON.stringify(oldFeature.properties) !== JSON.stringify(feature.properties)) {
         // Modified
         changedUrls.push(url);
      }
   }

   // Always add homepage and table page if there are changes
   if (changedUrls.length > 0) {
      changedUrls.push(`https://${INDEXNOW_HOST}/`);
      changedUrls.push(`https://${INDEXNOW_HOST}/table`);
   }

   if (changedUrls.length === 0) {
      console.log("No URLs to index.");
      return;
   }

   console.log(`Notifying IndexNow for ${changedUrls.length} URLs...`);

   if (!INDEXNOW_KEY) {
      console.log("Skipping IndexNow notification: INDEXNOW_KEY is not set.");
      return;
   }

   // IndexNow allows up to 10,000 URLs per request.
   // We'll slice if necessary, but unlikely for this use case.
   const batches = [];
   while (changedUrls.length > 0) {
      batches.push(changedUrls.splice(0, 10000));
   }

   for (const batch of batches) {
      try {
         const response = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: {
               "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
               host: INDEXNOW_HOST,
               key: INDEXNOW_KEY,
               keyLocation: INDEXNOW_KEY_LOCATION,
               urlList: batch,
            }),
         });

         if (response.ok) {
            console.log(`✅ IndexNow success: Sent ${batch.length} URLs`);
         } else {
            console.error(`❌ IndexNow failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
         }
      } catch (error) {
         console.error("❌ IndexNow error:", error);
      }
   }
}

main();
