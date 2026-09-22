import type { FeatureCollection, Point } from "geojson";
import type { MonumentFeature, MonumentProps } from "@/types";

/** Messages sent from the main thread to the data Web Worker. */
export type WorkerRequest = { type: "INIT" } | { type: "SEARCH"; query: string };

/** Messages sent from the data Web Worker back to the main thread. */
export type WorkerResponse =
   | { type: "DATA_READY"; geoData: FeatureCollection<Point, MonumentProps> }
   | { type: "SEARCH_RESULTS"; results: MonumentFeature[]; query: string }
   | { type: "ERROR"; error: string };
