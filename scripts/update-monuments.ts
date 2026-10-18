import { readFileSync, realpathSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createProgressReporter, formatBytes, formatRate } from "./lib/cliProgress";
import { convertData } from "./lib/convertData";
import { transformToGeoJSON, type GeoJSON } from "./lib/monumentTransform";
import {
   SPARQLQueryDispatcher,
   WIKIDATA_SPARQL_ENDPOINT,
   type SparqlBinding,
   type SparqlResults,
} from "./lib/sparqlClient";
import { recordStatsHistory } from "./lib/statsHistory";
import { writeHomeData } from "./write-home-data";
import { writeRegionsMap } from "./write-regions-map";

/**
 * Daily Wikidata data update — the whole `npm run update-data` pipeline.
 *
 * Fetches every Azerbaijani monument from Wikidata, transforms the SPARQL rows
 * into data/monuments.geojson and, only when the data actually changed, records
 * the day's counts and regenerates the derived artifacts (monuments.pbf,
 * home-data.json, regions-geo.json).
 *
 * The moving parts live in scripts/lib/:
 * - sparqlClient.ts        the HTTP surface (endpoint, headers, retrying)
 * - monumentTransform.ts   pure row -> feature transformation + dedupe
 * - statsHistory.ts        the daily stats-history entry
 * - convertData.ts         the geobuf conversion for the map payload
 * - cliProgress.ts         the fetch progress line in the terminal
 */

const __filename = fileURLToPath(import.meta.url);
// scripts/ — this file lives in scripts/, its helpers in scripts/lib/
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const GEOJSON_PATH = path.join(DATA_DIR, "monuments.geojson");

// SPARQL Query to fetch monuments in Azerbaijan
const SPARQL_QUERY = readFileSync(path.join(__dirname, "queries", "monuments.rq"), "utf-8");

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
      const reporter = createProgressReporter("Fetching monuments from Wikidata…");
      const queryDispatcher = new SPARQLQueryDispatcher(WIKIDATA_SPARQL_ENDPOINT);
      let loadedBytes = 0;
      const fetchStartedAt = Date.now();
      let results: SparqlResults;
      try {
         results = await queryDispatcher.query(SPARQL_QUERY, (loaded) => {
            loadedBytes = loaded;
         });
      } catch (error) {
         // The outer handler prints the error; drop the live line first.
         reporter.clear();
         throw error;
      }
      const fetchElapsedMs = Date.now() - fetchStartedAt;
      reporter.succeed(
         `${formatBytes(loadedBytes)} in ${(fetchElapsedMs / 1000).toFixed(1)}s ` +
            `(${formatRate((loadedBytes * 1000) / Math.max(1, fetchElapsedMs))})`,
      );
      const bindings = results.results.bindings as SparqlBinding[];

      const {
         data: newData,
         mergedDuplicates,
         conflictingDuplicates,
      } = transformToGeoJSON(bindings);

      const locatedCount = newData.features.filter((f) => f.geometry).length;
      console.log(
         `✓ ${newData.features.length} monuments (${locatedCount} located) — ` +
            `${mergedDuplicates} duplicate${mergedDuplicates === 1 ? "" : "s"} merged, ` +
            `${conflictingDuplicates} register-number conflict${conflictingDuplicates === 1 ? "" : "s"}`,
      );

      // 3. Check if data has actually changed
      if (existingData) {
         if (JSON.stringify(existingData) === JSON.stringify(newData)) {
            console.log(
               "No changes detected — skipped the data write and the derived artifacts (geobuf, home data, regions map).",
            );
            process.exit(0);
         }
         console.log(`Updated ${newData.features.length} monuments.`);
      } else {
         console.log(`Fetched ${newData.features.length} monuments.`);
      }

      // 4. Save new data
      await fs.writeFile(GEOJSON_PATH, JSON.stringify(newData, null, 4));
      console.log(`Saved updated GeoJSON to ${GEOJSON_PATH}`);

      // 5. Save history (skipped on no-change runs; see recordStatsHistory)
      if (existingData) {
         await recordStatsHistory(newData);
      }

      // 6. Regenerate the derived artifacts. They are pure functions of the
      //    committed data files, so a no-change run (which exited in step 3)
      //    would only rewrite identical bytes.
      await convertData();
      await writeHomeData();
      await writeRegionsMap();
   } catch (error) {
      console.error("Error updating monuments:", error);
      process.exit(1);
   }
}

// Import-safe entry guard: this module is imported by scripts/lib tests, so
// only run the pipeline when executed directly (tsx scripts/update-monuments.ts).
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(__filename)) {
   main();
}
