import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { encode } from "geobuf";
import { PbfWriter as Pbf } from "pbf";
import { writeFileAtomic } from "./atomicWrite";
import { formatBytes } from "./cliProgress";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEOJSON_PATH = path.join(__dirname, "../../data/monuments.geojson");
const OUTPUT_PATH = path.join(__dirname, "../../public/monuments.pbf");

type GeoJsonInput = Parameters<typeof encode>[0];

/**
 * Pure geobuf encode, exported so the round-trip test needs no file I/O.
 *
 * Mirrors what `json2geobuf` does — `encode(geojson, new Pbf())` — with the
 * top-level `pbf` dependency. Note it needs `PbfWriter`: geobuf's encoder
 * calls the write-side API, which `PbfReader` (used to decode in the data
 * worker) does not have.
 */
export const encodeGeobuf = (geojson: GeoJsonInput): Uint8Array => encode(geojson, new Pbf());

/** Encodes a GeoJSON document into the exact bytes written to monuments.pbf. */
export function buildMonumentsPbf(geojson: { type: string; features: unknown[] }): Buffer {
   // `@types/geojson` models Feature.geometry as non-nullable, but coord-less
   // monuments (`geometry: null`) are intentionally part of this pipeline.
   return Buffer.from(encode(geojson as GeoJsonInput, new Pbf()));
}

/**
 * Writes the pre-encoded monuments payload atomically and reports its size.
 *
 * Split from {@link buildMonumentsPbf} so the daily pipeline can compute every
 * artifact from the fetched data before touching any published file.
 */
export async function writeMonumentsPbf(buffer: Buffer): Promise<void> {
   await writeFileAtomic(OUTPUT_PATH, buffer);

   console.log(
      `Wrote ${path.relative(process.cwd(), OUTPUT_PATH)} — ${formatBytes(buffer.byteLength)}`,
   );
}

/**
 * Rewrites public/monuments.pbf from data/monuments.geojson.
 *
 * In-process equivalent of the `json2geobuf` CLI the daily chain used to shell
 * out to — same `geobuf.encode`, so the produced bytes are identical — kept
 * here so the update pipeline can skip it when the source data did not change.
 */
export async function convertData(): Promise<void> {
   const geojson = JSON.parse(await fs.readFile(GEOJSON_PATH, "utf-8")) as {
      type: string;
      features: unknown[];
   };
   await writeMonumentsPbf(buildMonumentsPbf(geojson));
}
