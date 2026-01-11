<template>
   <div class="sidebar-home">
      <!-- 1. Header -->
      <div class="sidebar-header">
         <div class="header-logo-container">
            <img src="/wlm-az.svg" alt="WLM Azerbaijan" class="header-logo" />
         </div>
         <div class="header-titles">
            <h1 class="sidebar-title">Viki Abidələri Sevir</h1>
            <p class="sidebar-subtitle">Azərbaycan</p>
         </div>
      </div>

      <!-- 2. Search Component -->
      <SearchBar
         :monuments="monuments"
         :fuse-index="fuseIndex"
         @select-monument="$emit('select-monument', $event)"
      />

      <!-- 3. Dashboard Section -->
      <div class="dashboard-section">
         <div class="stats-dashboard">
            <div class="stat-item total">
               <span class="stat-label">Cəmi</span>
               <span class="stat-value">{{ stats.total }}</span>
            </div>
            <div class="stat-item with-image">
               <span class="stat-label">Şəkilli</span>
               <span class="stat-value">{{ stats.withImage }}</span>
            </div>
            <div class="stat-item no-image">
               <span class="stat-label">Şəkilsiz</span>
               <span class="stat-value">{{ stats.total - stats.withImage }}</span>
            </div>
         </div>

         <!-- 4. Filter Toggle -->
         <div class="view-settings">
            <div class="filter-toggle" @click="$emit('toggle-filter')">
               <div class="filter-info">
                  <CdxIcon :icon="cdxIconFunnel" size="small" class="filter-icon" />
                  <span class="filter-label">Yalnız şəkilsizləri göstər</span>
               </div>
               <CdxToggleSwitch v-model="filterEnabled" @click.stop />
            </div>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { Feature } from "geojson";
import { computed } from "vue";
import { CdxIcon, CdxToggleSwitch } from "@wikimedia/codex";
import { cdxIconFunnel } from "@wikimedia/codex-icons";
import SearchBar from "./SearchBar.vue";

interface Props {
   stats: { total: number; withImage: number };
   needsPhotoOnly: boolean;
   monuments: Feature[];
   fuseIndex?: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
   "toggle-filter": [];
   "select-monument": [feature: Feature];
}>();

// Computed to sync with parent's needsPhotoOnly prop
const filterEnabled = computed({
   get: () => props.needsPhotoOnly,
   set: () => emit("toggle-filter"),
});
</script>

<style scoped>
.sidebar-home {
   display: flex;
   flex-direction: column;
   gap: 1.5rem;
   padding: 1rem;
}

.sidebar-header {
   display: flex;
   align-items: center;
   gap: 1rem;
   padding-bottom: 0.5rem;
   border-bottom: 1px solid var(--border-color-subtle, #eaecf0);
}

.header-logo {
   width: 48px;
   height: 48px;
}

.sidebar-title {
   font-size: 1.25rem;
   font-weight: 700;
   color: var(--color-base, #202122);
   margin: 0;
   line-height: 1.2;
}

.sidebar-subtitle {
   font-size: 0.75rem;
   color: var(--color-subtle, #54595d);
   text-transform: uppercase;
   letter-spacing: 0.1em;
   margin: 2px 0 0;
}

.dashboard-section {
   display: flex;
   flex-direction: column;
   gap: 1.5rem;
}

.stats-dashboard {
   display: grid;
   grid-template-columns: repeat(3, 1fr);
   background-color: var(--background-color-disabled-subtle, #eaecf0);
   padding: 1px;
   gap: 1px;
}

.stat-item {
   background-color: #fff;
   padding: 1rem 0.5rem;
   display: flex;
   flex-direction: column;
   align-items: center;
   gap: 4px;
}

.stat-label {
   font-size: 0.6875rem;
   font-weight: 700;
   text-transform: uppercase;
   letter-spacing: 0.05em;
   color: var(--color-subtle, #54595d);
}

.stat-value {
   font-size: 1.5rem;
   font-weight: 700;
   color: var(--color-base, #202122);
   font-family: var(--font-family-serif, Georgia, serif);
}

.stat-item.total .stat-value {
   color: var(--color-progressive, #3366cc);
}
.stat-item.with-image .stat-value {
   color: var(--color-success, #14866d);
}
.stat-item.no-image .stat-value {
   color: var(--color-destructive, #d73333);
}

.view-settings {
   border-top: 1px solid var(--border-color-subtle, #eaecf0);
   padding-top: 1rem;
}

.filter-toggle {
   display: flex;
   align-items: center;
   justify-content: space-between;
   padding: 12px;
   background-color: var(--background-color-interactive-subtle, #f8f9fa);
   cursor: pointer;
   transition: background-color 0.2s;
}

.filter-toggle:hover {
   background-color: var(--background-color-disabled-subtle, #eaecf0);
}

.filter-info {
   display: flex;
   align-items: center;
   gap: 12px;
}

.filter-icon {
   color: var(--color-progressive, #3366cc);
}

.filter-label {
   font-size: 0.875rem;
   font-weight: 600;
   color: var(--color-base, #202122);
}
</style>
