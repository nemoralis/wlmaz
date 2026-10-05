<template>
   <div class="virtual-table-container relative flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <div class="table-header sticky top-0 z-20 flex border-b border-gray-200 bg-gray-50">
         <div
            v-for="col in columns"
            :key="col.id"
            :style="{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }"
            class="px-4 py-3 text-xs font-bold tracking-wider text-gray-500 uppercase"
         >
            <button
               v-if="col.allowSort"
               class="flex items-center gap-1 transition-colors hover:text-gray-900"
               @click="$emit('sort', col.id)"
            >
               {{ col.label }}
               <font-awesome-icon
                  v-if="sortState[col.id]"
                  :icon="sortState[col.id] === 'asc' ? 'chevron-up' : 'chevron-down'"
                  class="text-[10px]"
               />
            </button>
            <span v-else>{{ col.label }}</span>
         </div>
      </div>

      <!-- Scroll Viewport -->
      <div
         ref="viewport"
         class="relative flex-1 scrollbar-thin overflow-y-auto"
         @scroll="handleScroll"
      >
         <!-- Total Height Spacer -->
         <div
            :style="{ height: `${totalHeight}px` }"
            class="pointer-events-none absolute inset-0"
         ></div>

         <!-- Visible Rows -->
         <div
            class="absolute top-0 right-0 left-0"
            :style="{ transform: `translateY(${offsetY}px)` }"
         >
            <div
               v-for="row in visibleData"
               :key="getCanonicalId(row.inventory) || row.item"
               :style="{ height: `${rowHeight}px` }"
               class="flex items-center border-b border-gray-100 transition-colors hover:bg-blue-50/30"
            >
               <div
                  v-for="col in columns"
                  :key="col.id"
                  :style="{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }"
                  class="overflow-hidden px-4"
               >
                  <slot :name="`item-${col.id}`" :row="row">
                     <span class="text-sm text-gray-700">
                        {{ getColumnValue(row, col.id) }}
                     </span>
                  </slot>
               </div>
            </div>
         </div>

         <!-- Empty State -->
         <div
            v-if="data.length === 0"
            class="absolute inset-0 flex items-center justify-center p-8 text-gray-500"
         >
            <slot name="empty">Nəticə tapılmadı</slot>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { MonumentProps } from "@/types";
import { getCanonicalId } from "@/utils/monumentFormatters.ts";

interface Column {
   id: string;
   label: string;
   width?: string;
   allowSort?: boolean;
}

const props = defineProps<{
   data: MonumentProps[];
   columns: Column[];
   rowHeight: number;
   buffer?: number;
   sortState: Record<string, "asc" | "desc">;
}>();

defineEmits(["sort"]);

const viewport = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
const bufferCount = props.buffer || 5;

// Calculations
const totalHeight = computed(() => props.data.length * props.rowHeight);
const startIndex = computed(() =>
   Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - bufferCount),
);
const endIndex = computed(() => {
   const count = Math.ceil(viewportHeight.value / props.rowHeight) + bufferCount * 2;
   return Math.min(props.data.length, startIndex.value + count);
});

const visibleData = computed(() => props.data.slice(startIndex.value, endIndex.value));
const offsetY = computed(() => startIndex.value * props.rowHeight);

const getColumnValue = (row: MonumentProps, id: string): string => {
   const value = (row as Record<string, unknown>)[id];
   if (typeof value === "string" || typeof value === "number") return String(value);
   // Array-valued columns, e.g. `inventory` (string[]). Without this the cell
   // renders empty: the header and its sort key both work, so the column looks
   // present but every cell is blank. Joined the same way as the sort key in
   // TablePage.vue, so the displayed and sorted values agree.
   if (Array.isArray(value)) return value.filter((v) => v != null).join(", ");
   return "";
};

const handleScroll = (e: Event) => {
   scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
};

const updateViewportHeight = () => {
   if (viewport.value) {
      viewportHeight.value = viewport.value.clientHeight;
   }
};

/**
 * Watches the viewport's own size, which flex layout decides and this component
 * does not control.
 *
 * Measuring once on mount was enough as long as nothing above the table changed
 * height after the first paint. On a region page it does: the gallery and the
 * coverage stats render only once the monuments have loaded, which is later than
 * the region name resolves, so the box the observer would have measured at mount
 * is taller than the box it ends up in. A stale `viewportHeight` makes
 * `endIndex` render more rows than fit, which `overflow-hidden` then clips — the
 * table looks empty or truncated with no error to trace.
 *
 * ResizeObserver covers the window-resize case the listener used to handle, so
 * the listener is gone rather than left as a second source of truth.
 */
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
   updateViewportHeight();
   if (viewport.value) {
      resizeObserver = new ResizeObserver(updateViewportHeight);
      resizeObserver.observe(viewport.value);
   }
});

onUnmounted(() => {
   resizeObserver?.disconnect();
   resizeObserver = null;
});

// Reset scroll on data change if needed (e.g. search)
watch(
   () => props.data,
   () => {
      // We don't necessarily want to scroll to top every time if it's just a sort,
      // but if the filter changed we should. Let the parent handle this if it wants
   },
   { deep: false },
);

defineExpose({
   scrollToTop: () => {
      if (viewport.value) viewport.value.scrollTop = 0;
   },
});
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
   width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
   background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
   background: #e5e7eb;
   border-radius: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
   background: #d1d5db;
}
</style>
