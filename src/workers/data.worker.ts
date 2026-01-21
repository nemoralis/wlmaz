import Fuse from "fuse.js";
import geobuf from "geobuf";
import Pbf from "pbf";

let fuse: Fuse<any> | null = null;
let allFeatures: any[] = [];

self.onmessage = async (e) => {
   if (e.data.type === "INIT") {
      try {
         const response = await fetch("/monuments.pbf");
         if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
         }
         const buffer = await response.arrayBuffer();
         const geoData = geobuf.decode(new Pbf(buffer));

         if (geoData.type !== "FeatureCollection") {
            throw new Error("Data is not a FeatureCollection");
         }

         allFeatures = geoData.features;

         // Initialize Fuse
         fuse = new Fuse(allFeatures, {
            keys: ["properties.itemLabel", "properties.inventory", "properties.itemAltLabel"],
            threshold: 0.3,
            ignoreLocation: true,
         });

         self.postMessage({
            type: "DATA_READY",
            geoData,
         });
      } catch (err) {
         self.postMessage({
            type: "ERROR",
            error: err instanceof Error ? err.message : "Unknown error",
         });
      }
   } else if (e.data.type === "SEARCH") {
      const { query } = e.data;
      if (!fuse) return;

      if (!query || query.trim() === "") {
         self.postMessage({ type: "SEARCH_RESULTS", results: allFeatures, query });
         return;
      }

      const results = fuse.search(query).map((r) => r.item);
      self.postMessage({ type: "SEARCH_RESULTS", results, query });
   }
};
