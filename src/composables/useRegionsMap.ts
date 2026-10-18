/**
 * Loads the generated region map payload (`public/regions-geo.json`) once and
 * shares it.
 *
 * Both `/regions` and `/region/<name>` need the region list: the map draws it,
 * and a region page has to know which names actually exist so an unknown one
 * can 404 instead of rendering an empty page. The payload is a single request
 * that carries the simplified boundaries and the per-region coverage, so it is
 * memoised per module rather than refetched per component.
 */

import { computed, readonly, ref } from "vue";
import {
   parseRegionsGeo,
   regionKey,
   REGIONS_MAP_URL,
   type RegionCoverage,
   type RegionGeoCollection,
   type RegionsMapData,
} from "@/utils/regions";

const payload = ref<RegionsMapData | null>(null);
const isLoading = ref(false);
const loadFailed = ref(false);

/** In-flight request, so concurrent callers share one fetch. */
let inFlight: Promise<RegionsMapData | null> | null = null;

const load = async (): Promise<RegionsMapData | null> => {
   if (payload.value) return payload.value;
   if (inFlight) return inFlight;

   // Set before the request so a render that happens during the fetch already
   // sees the loading state, and cleared in `finally` on both paths.
   isLoading.value = true;
   inFlight = (async () => {
      try {
         const response = await fetch(REGIONS_MAP_URL);
         if (!response.ok) throw new Error(String(response.status));
         const data = parseRegionsGeo(await response.text());
         if (!data) throw new Error("malformed payload");
         payload.value = data;
         loadFailed.value = false;
         return data;
      } catch (e) {
         console.error("Failed to load the regions map", e);
         loadFailed.value = true;
         return null;
      } finally {
         // Without this the composable is stuck loading forever and callers
         // that gate on `isLoading` never render their content.
         isLoading.value = false;
         inFlight = null;
      }
   })();

   return inFlight;
};

export const useRegionsMap = () => {
   /** Every region, in file order. Empty until `load` resolves. */
   const regions = computed<RegionCoverage[]>(() => payload.value?.regions ?? []);

   /** The simplified boundaries, for `registerMap`. Null until `load` resolves. */
   const geoJson = computed<RegionGeoCollection | null>(() => payload.value?.geoJson ?? null);

   /**
    * Resolves a route param to a region, or `null` when it names no region.
    * Uses the same folded key as the monument filter so the page and the map
    * can never disagree about which name is which.
    */
   const findRegion = (name: string | null | undefined): RegionCoverage | null => {
      if (!name) return null;
      const key = regionKey(name);
      return regions.value.find((region) => regionKey(region.name) === key) ?? null;
   };

   return {
      load,
      payload: readonly(payload),
      regions,
      geoJson,
      isLoading: readonly(isLoading),
      loadFailed: readonly(loadFailed),
      findRegion,
   };
};
