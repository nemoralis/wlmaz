<template>
   <div class="monument-details">
      <!-- Header for Empty State -->
      <div v-if="!monument" class="empty-header">
         <span>Məlumat paneli</span>
         <CdxButton weight="quiet" aria-label="Bağla" @click="$emit('close')">
            <CdxIcon :icon="cdxIconClose" />
         </CdxButton>
      </div>

      <!-- Content when monument is selected -->
      <template v-if="monument">
         <!-- 1. Monument Info Card (Title + Description) -->
         <CdxCard class="info-card">
            <template #title>
               <div class="info-card-header">
                  <span class="info-card-title">{{ monument.itemLabel }}</span>
                  <div v-if="monument.itemAltLabel" class="alt-label">
                     {{ monument.itemAltLabel }}
                  </div>
                  <div class="info-card-actions">
                     <CdxButton
                        weight="quiet"
                        :class="{ 'action-button--success': linkCopied }"
                        aria-label="Linki kopyala"
                        @click="$emit('share')"
                     >
                        <CdxIcon :icon="linkCopied ? cdxIconCheck : cdxIconShare" />
                     </CdxButton>
                     <CdxButton weight="quiet" aria-label="Bağla" @click="$emit('close')">
                        <CdxIcon :icon="cdxIconClose" />
                     </CdxButton>
                  </div>
               </div>
            </template>
            <template v-if="monument.itemDescription" #description>
               <div class="info-card-description">{{ monument.itemDescription }}</div>
            </template>
            <template #supporting-text>
               <div v-if="monument.inventory || monument.itemAltLabel" class="title-metadata">
                  <div v-if="monument.inventory" class="inventory-chips">
                     <CdxInfoChip
                        v-for="inv in monument.inventory
                           .split(',')
                           .map((s: string) => s.trim())
                           .sort((a: string, b: string) =>
                              a.localeCompare(b, undefined, { numeric: true }),
                           )"
                        :key="inv"
                        class="inventory-chip"
                     >
                        #{{ inv }}
                     </CdxInfoChip>
                  </div>
               </div>
            </template>
         </CdxCard>

         <!-- 2. HERO IMAGE -->
         <div class="hero-card">
            <!-- Case A: Hero Image -->
            <template v-if="monument.image">
               <div class="hero-image-container">
                  <a :href="getDescriptionPage(monument.image)" target="_blank" rel="noopener">
                     <img
                        :key="monument.image"
                        :src="getOptimizedImage(monument.image)"
                        :srcset="getSrcSet(monument.image, [320, 640, 800])"
                        sizes="(max-width: 768px) 100vw, 400px"
                        alt="Abidənin şəkli"
                        class="hero-image"
                        loading="lazy"
                     />
                  </a>
               </div>

               <!-- Image Credits -->
               <div v-if="imageCredit" class="hero-credits">
                  <span>© {{ imageCredit.author }}</span>
               </div>
            </template>

            <!-- Case B: No Image -->
            <template v-else>
               <div class="no-image-container">
                  <div class="no-image-placeholder">
                     <CdxIcon :icon="cdxIconCamera" class="no-image-icon" />
                     <span>Şəkil yoxdur</span>
                  </div>
               </div>
            </template>
         </div>

         <!-- 3. CONTENT BODY (Actions) -->
         <div class="content-body">
            <div class="action-grid">
               <CdxButton
                  v-if="monument.commonsLink || monument.commonsCategory"
                  weight="normal"
                  class="action-link"
                  @click="openExternalLink(getCategoryUrl(monument))"
               >
                  <CdxIcon :icon="cdxIconLogoWikimediaCommons" />
                  Qalereyaya bax
               </CdxButton>

               <!-- Primary Action -->
               <CdxButton
                  v-if="isAuthenticated"
                  action="progressive"
                  weight="primary"
                  class="primary-action"
                  @click="$emit('open-upload')"
               >
                  <CdxIcon :icon="cdxIconUpload" />
                  Yeni şəkil yüklə
               </CdxButton>
               <CdxButton
                  v-else
                  action="progressive"
                  weight="normal"
                  class="primary-action"
                  @click="$emit('login')"
               >
                  <CdxIcon :icon="cdxIconLogIn" />
                  Şəkil yükləmək üçün daxil ol
               </CdxButton>
            </div>

            <!-- 4. INFO CARD (Metadata) -->
            <CdxCard class="info-card">
               <template #title>Metadata</template>
               <template #supporting-text>
                  <div class="info-section">
                     <!-- GPS Section -->
                     <div v-if="monument.lat && monument.lon" class="info-group">
                        <span class="info-group-label">Koordinatlar</span>
                        <div class="gps-actions">
                           <CdxButton
                              weight="quiet"
                              class="gps-link-btn"
                              title="Xəritə tətbiqində aç"
                              @click="openExternalLink(`geo:${monument.lat},${monument.lon}`)"
                           >
                              <CdxIcon :icon="cdxIconMapPin" />
                              {{ monument.lat.toFixed(4) }}, {{ monument.lon.toFixed(4) }}
                           </CdxButton>
                           <CdxButton
                              weight="quiet"
                              class="gps-copy-btn"
                              aria-label="Koordinatları kopyala"
                              title="Koordinatları kopyala"
                              @click="$emit('copy-coords', monument.lat, monument.lon)"
                           >
                              <CdxIcon
                                 :icon="coordsCopied ? cdxIconCheck : cdxIconCopy"
                                 :class="{ 'icon-success': coordsCopied }"
                              />
                           </CdxButton>
                        </div>
                     </div>

                     <!-- Links Section -->
                     <div class="info-group">
                        <span class="info-group-label">Xarici keçidlər</span>
                        <div class="links-row">
                           <CdxButton
                              v-if="monument.azLink"
                              weight="quiet"
                              class="link-chip"
                              @click="openExternalLink(monument.azLink)"
                           >
                              <CdxIcon :icon="cdxIconLogoWikipedia" />
                              Vikipediya
                           </CdxButton>
                           <CdxButton
                              v-if="monument.item"
                              weight="quiet"
                              class="link-chip"
                              @click="openExternalLink(monument.item)"
                           >
                              <CdxIcon :icon="cdxIconLogoWikidata" />
                              Vikidata
                           </CdxButton>
                        </div>
                     </div>
                  </div>
               </template>
            </CdxCard>
         </div>
      </template>

      <!-- Empty State -->
      <CdxCard v-if="!monument" class="empty-state-card">
         <div class="empty-state">
            <CdxIcon :icon="cdxIconMapPin" class="empty-icon" />
            <h3>Abidə Seçin</h3>
            <p>Detalları görmək üçün xəritədəki işarələrdən birinə klikləyin.</p>
         </div>
      </CdxCard>
   </div>
</template>

<script lang="ts" setup>
import { CdxButton, CdxCard, CdxIcon, CdxInfoChip } from "@wikimedia/codex";
import {
   cdxIconCamera,
   cdxIconCheck,
   cdxIconClose,
   cdxIconCopy,
   cdxIconLogIn,
   cdxIconLogoWikidata,
   cdxIconLogoWikimediaCommons,
   cdxIconLogoWikipedia,
   cdxIconMapPin,
   cdxIconShare,
   cdxIconUpload,
} from "@wikimedia/codex-icons";
import type { MonumentProps } from "@/types";
import {
   getCategoryUrl,
   getDescriptionPage,
   getOptimizedImage,
   getSrcSet,
} from "@/utils/monumentFormatters";

interface Props {
   monument: MonumentProps | null;
   imageCredit: { author: string; license: string } | null;
   isAuthenticated: boolean;
   inventoryCopied: boolean;
   coordsCopied: boolean;
   linkCopied: boolean;
}

const props = defineProps<Props>();

defineEmits<{
   "open-upload": [];
   share: [];
   "copy-inventory": [inventory: string];
   "copy-coords": [lat: number, lon: number];
   login: [];
   close: [];
}>();

const openExternalLink = (url: string) => {
   if (url) {
      window.open(url, "_blank", "noopener");
   }
};
</script>

<style scoped>
.monument-details {
   display: flex;
   flex-direction: column;
   gap: 1rem;
   padding: 0 1rem 1rem; /* Horizontal padding for consistent alignment */
}

/* Hero Card */
.hero-card {
   border-radius: 0;
   overflow: hidden;
   padding: 0;
}

.hero-card :deep(.cdx-card__text) {
   padding: 0;
}

.hero-image-container {
   position: relative;
   min-height: 12rem;
   max-height: 25rem;
   display: flex;
   align-items: center;
   justify-content: center;
}

.hero-image {
   width: 100%;
   height: auto;
   max-height: 25rem;
   object-fit: contain;
   transition: opacity 0.3s ease;
}

.action-button--success {
   color: var(--color-success, #14866d);
}

.action-button--success {
   color: var(--color-success, #14866d);
}

.hero-credits {
   margin-top: 0.5rem;
   font-size: 0.75rem;
   color: var(--color-subtle, #54595d);
   text-align: right;
}

.no-image-container {
   position: relative;
   height: 16rem;
   display: flex;
   align-items: center;
   justify-content: center;
   background: var(--background-color-disabled-subtle, #eaecf0);
}

.no-image-placeholder {
   display: flex;
   flex-direction: column;
   align-items: center;
   gap: 0.5rem;
   color: var(--color-placeholder, #72777d);
}

.no-image-icon {
   width: 3rem;
   height: 3rem;
}

/* Content Body */
.content-body {
   display: flex;
   flex-direction: column;
   gap: 1rem;
}

.title-card,
.info-card {
   position: relative;
   border-radius: 0;
   border: none !important;
   box-shadow: none !important;
}

/* Remove default internal padding to align with container padding */
.info-card :deep(.cdx-card__text) {
   padding: 0 !important;
}

.info-card-header {
   /* No flex needed if button is absolute */
   margin-bottom: 0.5rem;
}

.info-card-title {
   display: block;
   font-size: 1.5rem !important;
   line-height: 1.25 !important;
   font-weight: 700 !important;
   padding-right: 5rem; /* Space for two buttons */
}

.info-card-actions {
   position: absolute;
   top: 0.5rem;
   right: 0.5rem;
   display: flex;
   gap: 0.25rem;
   z-index: 2;
}

.info-card-description {
   font-size: 0.875rem;
   line-height: 1.6;
   color: var(--color-base, #202122);
}

.alt-label {
   margin: 0.25rem 0 0;
   font-size: 0.875rem;
   font-style: italic;
   color: var(--color-subtle, #54595d);
}

.title-metadata {
   margin-top: 0.75rem;
}

.inventory-chips {
   display: flex;
   flex-wrap: wrap;
   gap: 0.5rem;
}

.inventory-chip {
   cursor: copy;
}

/* Action Grid */
.action-grid {
   display: grid;
   grid-template-columns: repeat(2, 1fr);
   gap: 0.75rem;
}

.action-link {
   grid-column: span 2;
   justify-content: center;
   width: 100%;
}

.primary-action {
   grid-column: span 2;
   justify-content: center;
   width: 100%;
}

/* Info Card Refinement */
.info-section {
   display: flex;
   flex-direction: column;
   gap: 1.5rem;
}

.info-group {
   display: flex;
   flex-direction: column;
   gap: 0.5rem;
}

.info-group-label {
   font-size: 0.75rem;
   font-weight: 700;
   text-transform: uppercase;
   letter-spacing: 0.05em;
   color: var(--color-subtle, #54595d);
}

.gps-actions {
   display: flex;
   gap: 4px;
   background: var(--background-color-disabled-subtle, #eaecf0);
   padding: 2px;
   width: fit-content;
}

.gps-link-btn {
   justify-content: flex-start !important;
   font-family: monospace;
   font-size: 0.875rem;
}

.gps-copy-btn {
   min-width: 32px !important;
}

.icon-success {
   color: var(--color-success, #14866d) !important;
}

.links-row {
   display: flex;
   flex-wrap: wrap;
   gap: 0.5rem;
}

.link-chip {
   border: 1px solid var(--border-color-base, #a2a9b1) !important;
   background-color: #fff !important;
}

/* Empty States */
.empty-header {
   display: flex;
   align-items: center;
   justify-content: space-between;
   font-size: 0.75rem;
   font-weight: 600;
   text-transform: uppercase;
   letter-spacing: 0.05em;
   color: var(--color-subtle, #54595d);
   margin-bottom: 0.5rem;
}

.empty-state-card {
   border-radius: 0;
}

.empty-state {
   display: flex;
   flex-direction: column;
   align-items: center;
   justify-content: center;
   text-align: center;
   padding: 3rem 1rem;
   color: var(--color-subtle, #54595d);
}

.empty-icon {
   width: 3rem;
   height: 3rem;
   color: var(--color-progressive, #3366cc);
   margin-bottom: 1rem;
}

.empty-state h3 {
   margin: 0 0 0.5rem;
   font-size: 1.125rem;
   color: var(--color-base, #202122);
}

.empty-state p {
   margin: 0;
   max-width: 200px;
   font-size: 0.875rem;
}
</style>
