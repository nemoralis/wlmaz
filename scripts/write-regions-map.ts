/**
 * Generates `public/regions-geo.json` — the simplified region boundaries and
 * the per-region photo coverage that `RegionsMap.vue` draws the Azerbaijan
 * region map from.
 *
 * `data/regions.geojson` is 10 MB of source geometry whose raw coordinates are
 * far too much to send to a browser. This script converts it once, at build
 * time, into a simplified WGS84 FeatureCollection (~245 KB, ~69 KB gzipped)
 * and pairs every region with the same `regionPhotoStats` the `/region/<name>`
 * pages compute, so the map's shading and a region page cannot disagree. It
 * writes the result to `public/`, the same way `scripts/lib/convertData.ts`
 * produces `monuments.pbf` and `write-home-data.ts` produces `home-data.json`.
 *
 * The source geojson is read-only: nothing here rewrites or repairs it, and no
 * monument `parentLabel` is touched.
 *
 * Offline: reads only committed files, no network.
 */
import { realpathSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { MonumentProps } from "../src/types";
import {
   buildRegionsGeoJson,
   REGION_NAME_PROPERTY,
   regionCoverages,
   type RegionFeature,
   type RegionsMapData,
} from "../src/utils/regions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGIONS_PATH = path.join(__dirname, "../data/regions.geojson");
const MONUMENTS_PATH = path.join(__dirname, "../data/monuments.geojson");
const OUTPUT_PATH = path.join(__dirname, "../public/regions-geo.json");

interface FeatureCollection {
   features: RegionFeature[];
}

interface MonumentCollection {
   features: Array<{ properties: MonumentProps }>;
}

export const writeRegionsMap = async (): Promise<void> => {
   const [regionsFile, monumentsFile] = await Promise.all([
      fs.readFile(REGIONS_PATH, "utf-8"),
      fs.readFile(MONUMENTS_PATH, "utf-8"),
   ]);

   const features = (JSON.parse(regionsFile) as FeatureCollection).features;
   const monuments = (JSON.parse(monumentsFile) as MonumentCollection).features.map(
      (feature) => feature.properties,
   );

   const geoJson = buildRegionsGeoJson(features);
   const payload: RegionsMapData = {
      geoJson,
      // Derived from the built features, so a coverage entry cannot name a
      // region the map does not draw.
      regions: regionCoverages(geoJson.features, monuments),
   };

   // Every source feature must survive the conversion: a name the map cannot
   // draw is a region the user can never open from `/regions`, which would
   // fail silently.
   const sourceNames = new Set(
      features
         .map((feature) => feature.properties?.[REGION_NAME_PROPERTY])
         .filter((name): name is string => typeof name === "string" && name.length > 0),
   );
   const builtNames = new Set(geoJson.features.map((feature) => feature.properties.name));

   const missing = [...sourceNames].filter((name) => !builtNames.has(name));
   if (missing.length > 0) {
      throw new Error(`regions missing from the simplified map: ${missing.join(", ")}`);
   }

   await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload)}\n`);

   const bytes = (await fs.stat(OUTPUT_PATH)).size;
   console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} — ` +
         `${geoJson.features.length} regions, ${(bytes / 1024).toFixed(0)} KB`,
   );
};

// Import-safe entry guard: the daily pipeline (scripts/update-monuments.ts)
// imports this function, so only run it when executed directly.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(__filename)) {
   writeRegionsMap().catch((error) => {
      console.error(error);
      process.exit(1);
   });
}
