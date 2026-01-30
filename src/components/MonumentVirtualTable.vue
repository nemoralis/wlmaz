<template>
  <div class="virtual-table-container flex flex-1 flex-col overflow-hidden relative">
    <!-- Header -->
    <div class="table-header flex bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
      <div 
        v-for="col in columns" 
        :key="col.id"
        :style="{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }"
        class="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider"
      >
        <button 
          v-if="col.allowSort"
          class="flex items-center gap-1 hover:text-gray-900 transition-colors"
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
      class="flex-1 overflow-y-auto relative scrollbar-thin"
      @scroll="handleScroll"
    >
      <!-- Total Height Spacer -->
      <div :style="{ height: `${totalHeight}px` }" class="pointer-events-none absolute inset-0"></div>

      <!-- Visible Rows -->
      <div 
        class="absolute left-0 right-0 top-0"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div 
          v-for="row in visibleData" 
          :key="row.inventory"
          :style="{ height: `${rowHeight}px` }"
          class="flex border-b border-gray-100 hover:bg-blue-50/30 transition-colors items-center"
        >
          <div 
            v-for="col in columns" 
            :key="col.id"
            :style="{ width: col.width || 'auto', flex: col.width ? 'none' : 1 }"
            class="px-4 overflow-hidden"
          >
            <slot :name="`item-${col.id}`" :row="row">
              <span class="text-sm text-gray-700">{{ row[col.id] }}</span>
            </slot>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="data.length === 0" class="absolute inset-0 flex items-center justify-center p-8 text-gray-500">
        <slot name="empty">Nəticə tapılmadı</slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { MonumentProps } from '../types';

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
  sortState: Record<string, 'asc' | 'desc'>;
}>();

defineEmits(['sort']);

const viewport = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
const bufferCount = props.buffer || 5;

// Calculations
const totalHeight = computed(() => props.data.length * props.rowHeight);
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - bufferCount));
const endIndex = computed(() => {
  const count = Math.ceil(viewportHeight.value / props.rowHeight) + bufferCount * 2;
  return Math.min(props.data.length, startIndex.value + count);
});

const visibleData = computed(() => props.data.slice(startIndex.value, endIndex.value));
const offsetY = computed(() => startIndex.value * props.rowHeight);

const handleScroll = (e: Event) => {
  scrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
};

const updateViewportHeight = () => {
  if (viewport.value) {
    viewportHeight.value = viewport.value.clientHeight;
  }
};

onMounted(() => {
  updateViewportHeight();
  window.addEventListener('resize', updateViewportHeight);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportHeight);
});

// Reset scroll on data change if needed (e.g. search)
watch(() => props.data, () => {
  // We don't necessarily want to scroll to top every time if it's just a sort, 
  // but if the filter changed we should. Let the parent handle this if it wants
}, { deep: false });

defineExpose({
  scrollToTop: () => {
    if (viewport.value) viewport.value.scrollTop = 0;
  }
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
