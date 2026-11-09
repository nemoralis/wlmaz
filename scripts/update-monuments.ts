import { readFileSync, realpathSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { MonumentProps } from "../src/types";
import { writeFileAtomic } from "./lib/atomicWrite";
import { createProgressReporter, formatBytes, formatRate } from "./lib/cliProgress";
import { buildMonumentsPbf, writeMonumentsPbf } from "./lib/convertData";
import { transformToGeoJSON, type GeoJSON } from "./lib/monumentTransform";
import {
   SPARQLQueryDispatcher,
   WIKIDATA_SPARQL_ENDPOINT,
   type SparqlBinding,
   type SparqlResults,
} from "./lib/sparqlClient";
import { buildStatsHistory, writeStatsHistory } from "./lib/statsHistory";
import {
   buildRegionsMapPayload,
   readRegionFeatures,
   writeRegionsMapPayload,
} from "./write-regions-map";

/**
 * Daily Wikidata data update — the whole `npm run update-data` pipeline.
 *
 * Fetches every Azerbaijani monument from Wikidata, transforms the SPARQL rows
 * into data/monuments.geojson and, only when the data actually changed, records
 * the day's counts and regenerates the derived artifacts (monuments.pbf,
 * regions-geo.json).
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
               "No changes detected — skipped the data write and the derived artifacts (geobuf, regions map).",
            );
            process.exit(0);
         }
         console.log(`Updated ${newData.features.length} monuments.`);
      } else {
         console.log(`Fetched ${newData.features.length} monuments.`);
      }

      // 4. Compute every derived artifact before writing any published file.
      //    A failure in any of these leaves the previous data set untouched.
      const monumentsPbf = buildMonumentsPbf(newData);
      const regionFeatures = await readRegionFeatures();
      const regionsPayload = buildRegionsMapPayload(
         regionFeatures,
         newData.features.map((feature) => feature.properties as MonumentProps),
      );
      const statsHistory = existingData ? await buildStatsHistory(newData) : null;

      // 5. Commit. Derived artifacts first and the source GeoJSON last: if a
      //    write fails, the next run still sees the old source and retries the
      //    whole set instead of treating a partial update as current.
      await writeMonumentsPbf(monumentsPbf);
      await writeRegionsMapPayload(regionsPayload);
      if (statsHistory) {
         await writeStatsHistory(statsHistory);
      }

      await writeFileAtomic(GEOJSON_PATH, JSON.stringify(newData, null, 4));
      console.log(`Saved updated GeoJSON to ${GEOJSON_PATH}`);
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
