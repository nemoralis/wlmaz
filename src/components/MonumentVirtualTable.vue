<template>
   <div class="virtual-table-container relative flex flex-1 flex-col overflow-hidden">
      <!-- Header: scrolls horizontally in sync with the viewport below. -->
      <div
         class="table-header sticky top-0 z-20 overflow-hidden border-b border-gray-200 bg-gray-50"
      >
         <div
            class="flex"
            :style="{
               width: `${contentWidth}px`,
               margin: '0 auto',
               transform: `translateX(${-scrollLeft}px)`,
            }"
         >
            <div
               v-for="col in columns"
               :key="col.id"
               :style="{ width: col.width }"
               :class="[
                  col.hideBelow === 'md' ? 'hidden md:block' : '',
                  'shrink-0 overflow-hidden px-2 py-3 text-xs font-bold tracking-wider whitespace-nowrap text-gray-500 uppercase sm:px-4',
               ]"
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
      </div>

      <!-- Scroll Viewport (vertical virtualization + horizontal scroll) -->
      <div
         ref="viewport"
         class="relative flex-1 scrollbar-thin overflow-auto"
         @scroll="handleScroll"
      >
         <!-- Total Height Spacer -->
         <div
            :style="{ height: `${totalHeight}px`, width: '100%' }"
            class="pointer-events-none absolute top-0 left-0"
         ></div>

         <!-- Visible Rows -->
         <div
            class="absolute top-0 right-0 left-0"
            :style="{
               transform: `translateY(${offsetY}px)`,
               width: `${contentWidth}px`,
               margin: '0 auto',
            }"
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
                  :style="{ width: col.width }"
                  :class="[
                     col.hideBelow === 'md' ? 'hidden md:block' : '',
                     'shrink-0 overflow-hidden px-2 sm:px-4',
                  ]"
               >
                  <slot :name="`item-${col.id}`" :row="row">
                     <span class="block text-sm break-words text-gray-700">
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
   /** Fixed pixel width (e.g. "100px"). The table is exactly the sum of its
    *  columns: centered when wider than the viewport, scrolling when not. */
   width: string;
   /** Hide below the `md` breakpoint (6 columns don't fit a handset). */
   hideBelow?: "md";
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
const scrollLeft = ref(0);
const viewportHeight = ref(0);
const viewportWidth = ref(0);
const bufferCount = props.buffer || 5;

const parsePx = (value: string): number => {
   const parsed = parseInt(value, 10);
   return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * The table's total width: the sum of the (fixed) column widths, ignoring
 * the columns hidden at the current breakpoint — so on a phone the table
 * scrolls sideways by the columns you can actually see, and no further.
 */
const contentWidth = computed(() =>
   props.columns
      .filter((col) => col.hideBelow !== "md" || viewportWidth.value >= 768)
      .reduce((sum, col) => sum + parsePx(col.width), 0),
);

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
   const target = e.currentTarget as HTMLElement;
   scrollTop.value = target.scrollTop;
   scrollLeft.value = target.scrollLeft;
};

const updateViewportSize = () => {
   if (!viewport.value) return;
   viewportHeight.value = viewport.value.clientHeight;
   viewportWidth.value = viewport.value.clientWidth;
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
   updateViewportSize();
   if (viewport.value) {
      resizeObserver = new ResizeObserver(updateViewportSize);
      resizeObserver.observe(viewport.value);
   }
});

onUnmounted(() => {
   resizeObserver?.disconnect();
   resizeObserver = null;
});

/**
 * Keep the scroll position inside the new list when a filter shrinks it.
 * Without this, `scrollTop` can point past the last row, `visibleData` becomes
 * empty, and the table renders blank until the user scrolls by hand.
 */
watch(
   () => props.data.length,
   () => {
      if (!viewport.value) return;
      const maxScrollTop = Math.max(0, totalHeight.value - viewportHeight.value);
      if (scrollTop.value > maxScrollTop) {
         viewport.value.scrollTop = maxScrollTop;
         scrollTop.value = maxScrollTop;
      }
   },
);

defineExpose({
   scrollToTop: () => {
      // Update the reactive mirror immediately; waiting for the DOM scroll
      // event would race a data-shrink clamp in the same tick.
      scrollTop.value = 0;
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
