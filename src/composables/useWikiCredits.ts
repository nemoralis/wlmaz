import { ref } from "vue";

export function useWikiCredits() {
   const imageCredit = ref<{ author: string; license: string } | null>(null);
   const creditLoading = ref(false);

   const fetchImageMetadata = async (imageUrl: string) => {
      if (!imageUrl) {
         imageCredit.value = null;
         return;
      }

      creditLoading.value = true;

      let filename = decodeURIComponent(imageUrl).split("Special:FilePath/").pop() || "";
      if (!filename.startsWith("File:")) {
         filename = `File:${filename}`;
      }

      try {
         const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(filename)}&formatversion=2&origin=*`;
         const res = await fetch(apiUrl);
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

            imageCredit.value = {
               author: author || "Wikimedia Commons",
               license: meta.LicenseShortName?.value || "CC BY-SA",
            };
         } else {
            imageCredit.value = null;
         }
      } catch (e) {
         console.error("Failed to load credits", e);
         imageCredit.value = null;
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
