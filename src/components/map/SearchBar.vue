<template>
   <div class="mb-6">
      <div class="relative">
         <input
            ref="searchInput"
            v-model="searchQuery"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="searchQuery && searchResults.length > 0 ? 'true' : 'false'"
            aria-controls="search-results"
            aria-label="Abidə axtar"
            type="text"
            placeholder="Abidə axtar..."
            class="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 pl-11 text-sm shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            @keydown="handleSearchKeydown"
         />
         <i class="fa fa-search absolute top-3 left-4 text-gray-400" aria-hidden="true"></i>
         <button
            v-if="searchQuery"
            aria-label="Axtarışı təmizlə"
            class="absolute top-3 right-4 cursor-pointer text-gray-400 transition-colors hover:text-red-500"
            @click="clearSearch"
         >
            <i class="fa fa-times" aria-hidden="true"></i>
         </button>
      </div>

      <!-- Search Results -->
      <div
         v-if="searchQuery"
         id="search-results"
         role="listbox"
         aria-label="Axtarış nəticələri"
         class="absolute right-0 left-0 z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
         style="margin: 0 10px"
      >
         <div
            v-if="searchResults.length === 0"
            role="status"
            aria-live="polite"
            class="p-4 text-center text-sm text-gray-500"
         >
            Nəticə tapılmadı
         </div>
         <ul v-else class="divide-y divide-gray-100">
            <li
               v-for="(result, index) in searchResults"
               :key="result.item.properties?.id"
               :ref="(el) => setResultRef(el, index)"
               role="option"
               :aria-selected="selectedIndex === index"
               tabindex="0"
               class="cursor-pointer px-4 py-3 transition-colors hover:bg-blue-50"
               :class="{ 'bg-blue-50': selectedIndex === index }"
               @click="selectResult(result.item)"
               @keydown.enter="selectResult(result.item)"
               @keydown.space.prevent="selectResult(result.item)"
            >
               <div class="font-medium text-gray-800">
                  {{ result.item.properties?.itemLabel }}
               </div>
               <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                  <span
                     v-if="result.item.properties?.inventory"
                     class="rounded bg-gray-100 px-1.5 py-0.5 font-mono"
                  >
                     {{ result.item.properties?.inventory }}
                  </span>
                  <span v-if="result.item.properties?.image" class="text-green-600">
                     <i class="fa fa-image" aria-hidden="true"></i> Şəkilli
                  </span>
               </div>
            </li>
         </ul>
      </div>

      <!-- Screen reader announcement for search results -->
      <div v-if="searchQuery" role="status" aria-live="polite" aria-atomic="true" class="sr-only">
         {{ searchResults.length }} nəticə tapıldı
      </div>
   </div>
</template>

<script lang="ts" setup>
import Fuse from "fuse.js";
import type { Feature } from "geojson";
import { computed, ref, watch } from "vue";

interface Props {
   monuments: Feature[];
   fuseIndex?: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
   "select-monument": [feature: Feature];
}>();

// Search state
const searchInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");
const debouncedSearchQuery = ref("");
const selectedIndex = ref(-1);
const resultRefs: (HTMLElement | null)[] = [];

let fuse: Fuse<Feature> | null = null;
let searchTimeout: ReturnType<typeof setTimeout>;

// Initialize Fuse search
watch(
   [() => props.monuments, () => props.fuseIndex],
   ([monuments, fuseIndex]) => {
      if (!monuments || monuments.length === 0) return;

      const options = {
         keys: ["properties.itemLabel", "properties.inventory", "properties.itemAltLabel"],
         threshold: 0.3,
         ignoreLocation: true,
      };

      if (fuseIndex) {
         // Load pre-computed index from worker
         const myIndex = Fuse.parseIndex(fuseIndex);
         fuse = new Fuse<Feature>(monuments, options, myIndex);
      } else {
         // Fallback if index not ready
         fuse = new Fuse(monuments, options);
      }
   },
   { immediate: true },
);

// Debounced search
watch(searchQuery, (newVal) => {
   clearTimeout(searchTimeout);
   searchTimeout = setTimeout(() => {
      debouncedSearchQuery.value = newVal;
      selectedIndex.value = -1; // Reset selection on new search
   }, 300);
});

// Computed search results
const searchResults = computed(() => {
   if (!debouncedSearchQuery.value || !fuse) return [];
   return fuse.search(debouncedSearchQuery.value).slice(0, 50);
});

// Methods
const clearSearch = () => {
   searchQuery.value = "";
   selectedIndex.value = -1;
};

const selectResult = (feature: Feature) => {
   emit("select-monument", feature);
   clearSearch();
};

const setResultRef = (el: any, index: number) => {
   if (el) {
      resultRefs[index] = el as HTMLElement;
   }
};

const handleSearchKeydown = (event: KeyboardEvent) => {
   if (!searchResults.value.length) return;

   switch (event.key) {
      case "ArrowDown":
         event.preventDefault();
         selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1);
         resultRefs[selectedIndex.value]?.scrollIntoView({
            block: "nearest",
         });
         break;

      case "ArrowUp":
         event.preventDefault();
         selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
         if (selectedIndex.value >= 0) {
            resultRefs[selectedIndex.value]?.scrollIntoView({
               block: "nearest",
            });
         }
         break;

      case "Enter":
         event.preventDefault();
         if (selectedIndex.value >= 0) {
            selectResult(searchResults.value[selectedIndex.value].item);
         }
         break;

      case "Escape":
         event.preventDefault();
         clearSearch();
         searchInput.value?.blur();
         break;
   }
};
</script>
