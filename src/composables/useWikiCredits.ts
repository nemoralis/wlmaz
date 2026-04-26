import { ref } from "vue";

interface ImageCredit {
   author: string;
   license: string;
}

/**
 * Global in-memory cache to store metadata across component re-renders.
 * Using a Map ensures O(1) lookup and persistence while the SPA is active.
 */
const creditCache = new Map<string, ImageCredit | null>();

export function useWikiCredits() {
   const imageCredit = ref<ImageCredit | null>(null);
   const creditLoading = ref(false);

   /**
    * Fetches attribution and license metadata for a Wikimedia Commons image.
    * Implements caching and request timeouts for better performance and reliability.
    */
   const fetchImageMetadata = async (imageUrl: string) => {
      if (!imageUrl) {
         imageCredit.value = null;
         return;
      }

      // 1. Performance: Check cache first to avoid redundant network requests
      if (creditCache.has(imageUrl)) {
         imageCredit.value = creditCache.get(imageUrl) || null;
         return;
      }

      imageCredit.value = null;
      creditLoading.value = true;

      let filename = decodeURIComponent(imageUrl).split("Special:FilePath/").pop() || "";
      if (!filename.startsWith("File:")) {
         filename = `File:${filename}`;
      }

      try {
         const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(filename)}&formatversion=2&origin=*`;

         // 2. Performance: Add timeout to prevent hanging on slow connections.
         // Feature detection for AbortSignal.timeout to support older browsers.
         const fetchOptions: RequestInit = {};
         if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
            fetchOptions.signal = (AbortSignal as any).timeout(10000);
         }

         const res = await fetch(apiUrl, fetchOptions);

         if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

         const data = await res.json();

         const page = data.query?.pages?.[0];
         if (page && page.imageinfo && page.imageinfo[0]) {
            const meta = page.imageinfo[0].extmetadata;

            let author = meta.Attribution?.value;
            if (!author && meta.Artist?.value) {
               author = meta.Artist.value;
            }

            if (author) {
               author = author.replace(/<[^>]*>?/gm, "");
            }

            const result: ImageCredit = {
               author: author || "Wikimedia Commons",
               license: meta.LicenseShortName?.value || "CC BY-SA",
            };

            // Update state and cache
            imageCredit.value = result;
            creditCache.set(imageUrl, result);
         } else {
            imageCredit.value = null;
            creditCache.set(imageUrl, null);
         }
      } catch (e) {
         console.error("Failed to load credits", e);
         imageCredit.value = null;
         // Note: We don't cache failures to allow for subsequent retries if the network stabilizes
      } finally {
         creditLoading.value = false;
      }
   };

   return {
      imageCredit,
      creditLoading,
      fetchImageMetadata,
   };
}
