/**
 * Regenerates public/home-data.json — the landing-page snapshot Home.vue
 * fetches when it runs without a prerendered shell (`npm run dev`).
 *
 * Production gets the very same payload inlined into dist/index.html by
 * scripts/prerender.ts, which resolves the featured ids strictly. This script
 * stays non-strict (bad ids are skipped with a warning) so an experiment with
 * data/featured-monuments.json never blocks the daily data chain; the build
 * is the gate that must not ship a broken hero.
 *
 * Offline: reads only the committed geojson, no network.
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { resolveHomeData } from "../src/content/featured";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEOJSON_PATH = path.join(__dirname, "../data/monuments.geojson");
const FEATURED_PATH = path.join(__dirname, "../data/featured-monuments.json");
const OUTPUT_PATH = path.join(__dirname, "../public/home-data.json");

interface FeatureCollection {
   features: Array<{ geometry: unknown; properties: Record<string, string> }>;
}

const main = async (): Promise<void> => {
   const geojson = JSON.parse(await fs.readFile(GEOJSON_PATH, "utf-8")) as FeatureCollection;
   const featuredIds = JSON.parse(await fs.readFile(FEATURED_PATH, "utf-8")) as string[];

   const homeData = resolveHomeData(geojson.features, featuredIds, { strict: false });
   await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(homeData, null, 2)}\n`);

   console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} — ` +
         `${homeData.featured.length}/${featuredIds.length} featured, ` +
         `${homeData.total} located (${homeData.withImage} photographed), ` +
         `${homeData.regions.length} regions`,
   );
};

main().catch((error) => {
   console.error(error);
   process.exit(1);
});
