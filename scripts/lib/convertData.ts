import path from "path";
import { fileURLToPath } from "url";
import { encode } from "geobuf";
import { PbfWriter as Pbf } from "pbf";
import { writeFileAtomic } from "./atomicWrite";
import { formatBytes } from "./cliProgress";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, "../../public/monuments.pbf");

type GeoJsonInput = Parameters<typeof encode>[0];

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
