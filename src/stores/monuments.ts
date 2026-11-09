import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { MonumentFeature, MonumentGeoData, MonumentProps } from "@/types";
import type { WorkerResponse } from "@/types/worker.ts";
import DataWorker from "@/workers/data.worker.ts?worker";

/** One value for the dataset's lifecycle; the booleans remain for consumers. */
export type MonumentDataStatus = "idle" | "loading" | "ready" | "error";

export const useMonumentStore = defineStore("monuments", () => {
   const geoData = shallowRef<MonumentGeoData | null>(null);
   const monuments = shallowRef<MonumentProps[]>([]);
   const searchResults = shallowRef<MonumentFeature[]>([]);
   const isLoading = ref(false);
   const error = ref<string | null>(null);
   const isDataReady = ref(false);
   const status = computed<MonumentDataStatus>(() => {
      if (isDataReady.value) return "ready";
      if (isLoading.value) return "loading";
      if (error.value) return "error";
      return "idle";
   });
   const lastSearchQuery = ref("");
   const selectedMonument = ref<MonumentProps | null>(null);

   let worker: Worker | null = null;
   /** Latest search request; older worker responses are stale and must not win. */
   let searchRequestId = 0;

   /** Extracts the flattened display props (including lat/lon, when present) from a feature. */
   const toMonumentProps = (feature: MonumentFeature): MonumentProps => {
      if (!feature.geometry) {
         return { ...feature.properties };
      }
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
               searchResults.value = e.data.geoData.features;
               isDataReady.value = true;
               isLoading.value = false;
            } else if (e.data.type === "SEARCH_RESULTS") {
               if (e.data.requestId !== undefined && e.data.requestId !== searchRequestId) {
                  return;
               }
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
      searchRequestId += 1;
      worker.postMessage({ type: "SEARCH", query, requestId: searchRequestId });
   };

   return {
      geoData,
      monuments,
      searchResults,
      isLoading,
      error,
      status,
      isDataReady,
      lastSearchQuery,
      selectedMonument,
      init,
      search,
   };
});
