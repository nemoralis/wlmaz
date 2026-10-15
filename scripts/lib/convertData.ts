import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { encode } from "geobuf";
import { PbfWriter as Pbf } from "pbf";
import { formatBytes } from "./cliProgress";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEOJSON_PATH = path.join(__dirname, "../../data/monuments.geojson");
const OUTPUT_PATH = path.join(__dirname, "../../public/monuments.pbf");

/**
 * Pure geobuf encode, exported so the round-trip test needs no file I/O.
 *
 * Mirrors what `json2geobuf` does — `encode(geojson, new Pbf())` — with the
 * top-level `pbf` dependency. Note it needs `PbfWriter`: geobuf's encoder
 * calls the write-side API, which `PbfReader` (used to decode in the data
 * worker) does not have.
 */
export const encodeGeobuf = (geojson: Parameters<typeof encode>[0]): Uint8Array =>
   encode(geojson, new Pbf());

/**
 * Rewrites public/monuments.pbf from data/monuments.geojson.
 *
 * In-process equivalent of the `json2geobuf` CLI the daily chain used to shell
 * out to — same `geobuf.encode`, so the produced bytes are identical — kept
 * here so the update pipeline can skip it when the source data did not change.
 */
export async function convertData(): Promise<void> {
   const geojson = JSON.parse(await fs.readFile(GEOJSON_PATH, "utf-8"));
   const buffer = encodeGeobuf(geojson);

   await fs.writeFile(OUTPUT_PATH, Buffer.from(buffer));

   console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} — ${formatBytes(buffer.byteLength)}`,
   );
}
