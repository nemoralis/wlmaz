import Fuse from "fuse.js";
import * as geobuf from "geobuf";
import { PbfReader as Pbf } from "pbf";
import type { MonumentFeature, MonumentGeoData } from "@/types";
import type { WorkerRequest, WorkerResponse } from "@/types/worker.ts";

let fuse: Fuse<MonumentFeature> | null = null;
let allFeatures: MonumentFeature[] = [];

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
   if (e.data.type === "INIT") {
      try {
         const response = await fetch("/monuments.pbf");
         if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
         }
         const buffer = await response.arrayBuffer();
         const geoData = geobuf.decode(new Pbf(buffer)) as unknown as MonumentGeoData;

         if (geoData.type !== "FeatureCollection") {
            throw new Error("Data is not a FeatureCollection");
         }

         allFeatures = geoData.features as MonumentFeature[];

         // Initialize Fuse
         fuse = new Fuse(allFeatures, {
            keys: ["properties.itemLabel", "properties.inventory", "properties.itemAltLabel"],
            threshold: 0.3,
            ignoreLocation: true,
            useTokenSearch: true,
         });

         const msg: WorkerResponse = {
            type: "DATA_READY",
            geoData,
         };
         self.postMessage(msg);
      } catch (err) {
         const msg: WorkerResponse = {
            type: "ERROR",
            error: err instanceof Error ? err.message : "Unknown error",
         };
         self.postMessage(msg);
      }
   } else if (e.data.type === "SEARCH") {
      const { query } = e.data;
      if (!fuse) return;

      if (!query || query.trim() === "") {
         const msg: WorkerResponse = { type: "SEARCH_RESULTS", results: allFeatures, query };
         self.postMessage(msg);
         return;
      }

      const results = fuse.search(query).map((r) => r.item);
      const msg: WorkerResponse = { type: "SEARCH_RESULTS", results, query };
      self.postMessage(msg);
   }
};
