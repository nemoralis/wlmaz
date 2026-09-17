<template>
   <div class="sidebar-home">
      <!-- 1. Header -->
      <div class="sidebar-header">
         <h1 class="sidebar-title">Axtarış və Filtrlər</h1>
      </div>

      <!-- 2. Search Component -->
      <SearchBar @select-monument="$emit('select-monument', $event)" />

      <!-- 3. Dashboard Section -->
      <div class="dashboard-section">
         <div class="stats-dashboard">
            <div class="stat-item stat-item--needs-photo">
               <span class="stat-label">Şəkilsiz</span>
               <span class="stat-value">{{ stats.total - stats.withImage }}</span>
            </div>
            <div class="stat-item stat-item--with-photo">
               <span class="stat-label">Şəkilli</span>
               <span class="stat-value">{{ stats.withImage }}</span>
            </div>
            <div class="stat-item stat-item--total">
               <span class="stat-label">Cəmi</span>
               <span class="stat-value">{{ stats.total }}</span>
            </div>
         </div>

         <!-- Progress Bar -->
         <div class="progress-section">
            <div class="progress-bar">
               <div
                  class="progress-bar-fill"
                  :style="{ width: photoPercentage + '%' }"
               />
            </div>
            <span class="progress-label">
               {{ photoPercentage }}% abidənin şəkli çəkilib
            </span>
         </div>

         <!-- 4. Filter Toggle -->
         <div class="view-settings">
            <div class="filter-toggle" @click="$emit('toggle-filter')">
               <div class="filter-info">
                  <CdxIcon :icon="cdxIconFunnel" size="small" class="filter-icon" />
                  <span class="filter-label">Yalnız şəkilsizləri göstər</span>
               </div>
               <CdxToggleSwitch
                  v-model="filterEnabled"
                  aria-label="Yalnız şəkilsizləri göstər"
                  @click.stop
               />
            </div>
         </div>

         <!-- 5. Quick Links -->
         <div class="quick-links">
            <router-link to="/stats" class="quick-link">
               <CdxIcon :icon="cdxIconChart" size="small" class="quick-link-icon" />
               <span>Statistika</span>
            </router-link>
            <router-link to="/leaderboard" class="quick-link">
               <CdxIcon :icon=" cdxIconUserGroup" size="small" class="quick-link-icon" />
               <span>İştirakçılar</span>
            </router-link>
            <router-link to="/about" class="quick-link">
               <CdxIcon :icon="cdxIconInfo" size="small" class="quick-link-icon" />
               <span>Haqqımızda</span>
            </router-link>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { Feature } from "geojson";
import { computed } from "vue";
import { CdxIcon, CdxToggleSwitch } from "@wikimedia/codex";
import { cdxIconFunnel, cdxIconChart, cdxIconUserGroup, cdxIconInfo } from "@wikimedia/codex-icons";
import SearchBar from "./SearchBar.vue";

interface Props {
   stats: { total: number; withImage: number };
   needsPhotoOnly: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
   "toggle-filter": [];
   "select-monument": [feature: Feature];
}>();

const filterEnabled = computed({
   get: () => props.needsPhotoOnly,
   set: () => emit("toggle-filter"),
});

const photoPercentage = computed(() => {
   if (props.stats.total === 0) return 0;
   return Math.round((props.stats.withImage / props.stats.total) * 100);
});
</script>

<style scoped>
.sidebar-home {
   display: flex;
   flex-direction: column;
   gap: 1.5rem;
   padding: 1rem;
}

/* 1. Header */
.sidebar-header {
   padding-bottom: 0.75rem;
   border-bottom: 1px solid var(--border-color-subtle, #eaecf0);
}

.sidebar-title {
   font-size: 0.8125rem;
   font-weight: 600;
   color: var(--color-subtle, #54595d);
   text-transform: uppercase;
   letter-spacing: 0.05em;
   margin: 0;
}

/* 2. Dashboard */
.dashboard-section {
   display: flex;
   flex-direction: column;
   gap: 1rem;
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
   padding: 0.75rem 0.5rem;
   display: flex;
   flex-direction: column;
   align-items: center;
   gap: 4px;
   transition: background-color 0.3s ease;
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
   transition: color 0.3s ease;
}

/* Reordered: needs-photo first with red background */
.stat-item--needs-photo {
   background-color: var(--background-color-destructive-subtle, #fee7e6);
}

.stat-item--needs-photo .stat-value {
   color: var(--color-destructive, #d73333);
}

.stat-item--with-photo .stat-value {
   color: var(--color-success, #14866d);
}

.stat-item--total .stat-value {
   color: var(--color-progressive, #3366cc);
}

/* 3. Progress Bar */
.progress-section {
   display: flex;
   flex-direction: column;
   gap: 6px;
}

.progress-bar {
   width: 100%;
   height: 6px;
   background-color: var(--background-color-disabled-subtle, #eaecf0);
   border-radius: 3px;
   overflow: hidden;
}

.progress-bar-fill {
   height: 100%;
   background-color: var(--color-success, #14866d);
   border-radius: 3px;
   transition: width 0.5s ease;
}

.progress-label {
   font-size: 0.75rem;
   color: var(--color-subtle, #54595d);
   text-align: center;
}

/* 4. Filter Toggle */
.view-settings {
   border-top: 1px solid var(--border-color-subtle, #eaecf0);
   padding-top: 0.75rem;
}

.filter-toggle {
   display: flex;
   align-items: center;
   justify-content: space-between;
   padding: 10px 12px;
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
   gap: 10px;
}

.filter-icon {
   color: var(--color-progressive, #3366cc);
}

.filter-label {
   font-size: 0.8125rem;
   font-weight: 600;
   color: var(--color-base, #202122);
}

/* 5. Quick Links */
.quick-links {
   display: flex;
   flex-direction: column;
   gap: 2px;
   border-top: 1px solid var(--border-color-subtle, #eaecf0);
   padding-top: 0.75rem;
}

.quick-link {
   display: flex;
   align-items: center;
   gap: 10px;
   padding: 8px 12px;
   border-radius: 4px;
   font-size: 0.8125rem;
   font-weight: 500;
   color: var(--color-base, #202122);
   text-decoration: none;
   transition: background-color 0.15s;
}

.quick-link:hover {
   background-color: var(--background-color-interactive-subtle, #f8f9fa);
}

.quick-link-icon {
   color: var(--color-progressive, #3366cc);
}
</style>
