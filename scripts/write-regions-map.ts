/**
 * Generates `public/regions-map.json` — the SVG map payload that
 * `RegionsMap.vue` draws the Azerbaijan region map from.
 *
 * `data/regions.geojson` is 10 MB of source geometry whose raw path data
 * works out to ~2.9 MB, which is far too much to send to a browser. This
 * script converts it once, at build time, into simplified SVG paths
 * (~150 KB) and writes the result to `public/`, the same way
 * `convert-data` produces `monuments.pbf` and `write-home-data.ts` produces
 * `home-data.json`.
 *
 * The source geojson is read-only: nothing here rewrites or repairs it, and
 * no monument `parentLabel` is touched.
 *
 * Offline: reads only committed files, no network.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildRegionsMap, REGION_NAME_PROPERTY, type RegionFeature } from "../src/utils/regions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGIONS_PATH = path.join(__dirname, "../data/regions.geojson");
const OUTPUT_PATH = path.join(__dirname, "../public/regions-map.json");

interface FeatureCollection {
   features: RegionFeature[];
}

const main = async (): Promise<void> => {
   const geojson = JSON.parse(await fs.readFile(REGIONS_PATH, "utf-8")) as FeatureCollection;

   const map = buildRegionsMap(geojson.features);

   // Every feature must survive the conversion: a name the map cannot draw is
   // a region the user can never click, which would fail silently.
   const sourceNames = new Set(
      geojson.features
         .map((feature) => feature.properties?.[REGION_NAME_PROPERTY])
         .filter((name): name is string => typeof name === "string" && name.length > 0),
   );
   const mappedNames = new Set(map.regions.map((region) => region.name));

   const missing = [...sourceNames].filter((name) => !mappedNames.has(name));
   if (missing.length > 0) {
      throw new Error(`regions without a rendered path: ${missing.join(", ")}`);
   }

   await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(map)}\n`);

   const bytes = (await fs.stat(OUTPUT_PATH)).size;
   console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} — ` +
         `${map.regions.length} regions, ${(bytes / 1024).toFixed(0)} KB`,
   );
};

main().catch((error) => {
   console.error(error);
   process.exit(1);
});
