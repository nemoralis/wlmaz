import { ref } from "vue";
import osmtogeojson from "osmtogeojson";

export function useOverpass() {
   const loading = ref(false);
   const error = ref<string | null>(null);

   const fetchBuildingsWithWikidata = async (bbox: string) => {
      loading.value = true;
      error.value = null;

      const query = `
        [out:json][timeout:25];
        (
          nwr["building"]["wikidata"](${bbox});
        );
        out body;
        >;
        out skel qt;
      `;

      try {
         const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
         });

         if (!response.ok) {
            throw new Error(`Overpass API error: ${response.statusText}`);
         }

         const data = await response.json();
         return osmtogeojson(data);
      } catch (err: any) {
         error.value = err.message;
         console.error("Overpass fetch error:", err);
         return null;
      } finally {
         loading.value = false;
      }
   };

   return {
      loading,
      error,
      fetchBuildingsWithWikidata,
   };
}
