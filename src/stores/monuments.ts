import type { FeatureCollection, Point } from "geojson";
import { ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { MonumentFeature, MonumentProps } from "@/types";
import type { WorkerResponse } from "@/types/worker.ts";
import DataWorker from "@/workers/data.worker.ts?worker";

export const useMonumentStore = defineStore("monuments", () => {
   const geoData = shallowRef<FeatureCollection<Point, MonumentProps> | null>(null);
   const monuments = shallowRef<MonumentProps[]>([]);
   const searchResults = shallowRef<MonumentFeature[]>([]);
   const isLoading = ref(false);
   const error = ref<string | null>(null);
   const isDataReady = ref(false);
   const lastSearchQuery = ref("");
   const selectedMonument = ref<MonumentProps | null>(null);

   let worker: Worker | null = null;

   /** Extracts the flattened display props (including lat/lon) from a feature. */
   const toMonumentProps = (feature: MonumentFeature): MonumentProps => {
      const [lon, lat] = feature.geometry.coordinates;
      return { ...feature.properties, lat, lon };
   };

   const init = () => {
      if (isDataReady.value || isLoading.value) return;

      isLoading.value = true;
      error.value = null;

      if (!worker) {
         worker = new DataWorker();
         worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            if (e.data.type === "DATA_READY") {
               geoData.value = e.data.geoData;
               monuments.value = e.data.geoData.features.map((f) =>
                  toMonumentProps(f as MonumentFeature),
               );
               searchResults.value = e.data.geoData.features as MonumentFeature[];
               isDataReady.value = true;
               isLoading.value = false;
            } else if (e.data.type === "SEARCH_RESULTS") {
               searchResults.value = e.data.results;
               lastSearchQuery.value = e.data.query;
            } else if (e.data.type === "ERROR") {
               error.value = e.data.error;
               isLoading.value = false;
            }
         };
      }

      worker.postMessage({ type: "INIT" });
   };

   const search = (query: string) => {
      if (!worker || !isDataReady.value) return;
      worker.postMessage({ type: "SEARCH", query });
   };

   return {
      geoData,
      monuments,
      searchResults,
      isLoading,
      error,
      isDataReady,
      lastSearchQuery,
      selectedMonument,
      init,
      search,
   };
});
