import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { GeoJSON } from "./monumentTransform";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_PATH = path.join(__dirname, "../../public/stats-history.json");

/** A single daily stats-history entry written to stats-history.json. */
export interface HistoryEntry {
   date: string;
   timestamp: number;
   total: number;
   withImage: number;
   withoutImage: number;
}

/**
 * Appends today's monument counts to public/stats-history.json.
 *
 * Deliberate quirks, both inherited from the original pipeline:
 * - An entry is written **only when the data actually changed** (the caller
 *   exits before reaching this on a no-change run), so days without a data
 *   change leave gaps in the daily chart rather than repeating the previous
 *   day's numbers.
 * - The date key is UTC (`toISOString()`), so a run shortly after midnight
 *   Baku time is recorded under the previous UTC day.
 */
export async function recordStatsHistory(newData: GeoJSON): Promise<void> {
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

   const entry: HistoryEntry = {
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
}
