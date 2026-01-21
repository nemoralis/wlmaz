<template>
   <div class="search-container">
      <CdxSearchInput
         ref="searchInput"
         v-model="searchQuery"
         aria-label="Abidə axtar"
         placeholder="Abidə axtar..."
         :clearable="true"
         @keydown="handleSearchKeydown"
      />

      <!-- Search Results -->
      <div
         v-if="searchQuery"
         id="search-results"
         role="listbox"
         aria-label="Axtarış nəticələri"
         class="search-results-overlay"
      >
         <div
            v-if="searchResults.length === 0"
            role="status"
            aria-live="polite"
            class="p-4 text-center text-sm text-gray-500"
         >
            Nəticə tapılmadı
         </div>
         <ul v-else class="results-list">
            <li
               v-for="(result, index) in searchResults"
               :key="result.properties?.inventory || index"
               :ref="(el) => setResultRef(el, index)"
               role="option"
               :aria-selected="selectedIndex === index"
               tabindex="0"
               class="result-item"
               :class="{ 'result-item--selected': selectedIndex === index }"
               @click="selectResult(result)"
               @keydown.enter="selectResult(result)"
               @keydown.space.prevent="selectResult(result)"
            >
               <div class="result-label">
                  {{ result.properties?.itemLabel }}
               </div>
               <div class="result-meta">
                  <span v-if="result.properties?.inventory" class="inventory-tag">
                     {{ result.properties?.inventory }}
                  </span>
                  <span v-if="result.properties?.image" class="image-tag">
                     <CdxIcon :icon="cdxIconImage" size="x-small" /> Şəkilli
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
import type { Feature } from "geojson";
import { ref, watch, computed } from "vue";
import { CdxIcon, CdxSearchInput } from "@wikimedia/codex";
import { cdxIconImage } from "@wikimedia/codex-icons";
import { useMonumentStore } from "../../stores/monuments";

const monumentStore = useMonumentStore();

const emit = defineEmits<{
   "select-monument": [feature: Feature];
}>();

// Search state
const searchInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");
const selectedIndex = ref(-1);
const resultRefs: (HTMLElement | null)[] = [];

let searchTimeout: ReturnType<typeof setTimeout>;

const clearSearch = () => {
   searchQuery.value = "";
   selectedIndex.value = -1;
};

// 1. Internal search logic removed. We now use the store.
watch(searchQuery, (newVal) => {
   clearTimeout(searchTimeout);
   searchTimeout = setTimeout(() => {
      monumentStore.search(newVal);
      selectedIndex.value = -1;
   }, 300);
});

const searchResults = computed(() => {
   return monumentStore.searchResults.slice(0, 50);
});

// Methods
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
            selectResult(searchResults.value[selectedIndex.value]);
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

<style scoped>
.search-container {
   margin-bottom: 1.5rem;
   position: relative;
}

.search-results-overlay {
   position: absolute;
   top: 100%;
   left: 0;
   right: 0;
   z-index: 100;
   margin-top: 4px;
   background-color: #fff;
   border: 1px solid var(--border-color-base, #a2a9b1);
   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
   max-height: 60vh;
   overflow-y: auto;
}

.results-list {
   list-style: none;
   padding: 0;
   margin: 0;
}

.result-item {
   padding: 12px 16px;
   cursor: pointer;
   transition: background-color 0.1s;
   border-bottom: 1px solid var(--border-color-subtle, #eaecf0);
}

.result-item:last-child {
   border-bottom: none;
}

.result-item:hover,
.result-item--selected {
   background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.result-label {
   font-weight: 600;
   color: var(--color-base, #202122);
   font-size: 0.9375rem;
}

.result-meta {
   margin-top: 4px;
   display: flex;
   align-items: center;
   gap: 8px;
   font-size: 0.75rem;
}

.inventory-tag {
   background-color: var(--background-color-disabled-subtle, #eaecf0);
   padding: 2px 6px;
   font-family: monospace;
   color: var(--color-subtle, #54595d);
}

.image-tag {
   color: var(--color-success, #14866d);
   display: flex;
   align-items: center;
   gap: 4px;
}

.image-tag i {
   font-size: 0.75rem;
}
</style>
