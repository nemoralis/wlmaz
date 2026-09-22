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
                     <CdxInfoChip v-for="inv in sortedInventory" :key="inv" class="inventory-chip">
                        #{{ inv }}
                     </CdxInfoChip>
                  </div>
               </div>
            </template>
         </CdxCard>

         <!-- 2. HERO IMAGE -->
         <HeroImage
            :image="monument.image || ''"
            :description-page-url="descriptionPageUrl"
            :optimized-url="optimizedImageUrl"
            :src-set="srcSetUrl"
            :image-credit="imageCredit"
         />

         <!-- 3. CONTENT BODY (Actions) -->
         <div class="content-body">
            <div class="action-grid">
               <CdxButton
                  v-if="monument.commonsLink || monument.commonsCategory"
                  weight="normal"
                  class="action-link"
                  @click="openExternalLink(categoryUrl)"
               >
                  <CdxIcon :icon="cdxIconLogoWikimediaCommons" />
                  Qalereyaya bax
               </CdxButton>

               <!-- Primary Action -->
               <template v-if="auth.canUpload">
                  <CdxButton
                     :disabled="auth.isBlocked"
                     action="progressive"
                     :weight="auth.isBlocked ? 'normal' : 'primary'"
                     class="primary-action"
                     @click="$emit('open-upload')"
                  >
                     <CdxIcon :icon="auth.isBlocked ? cdxIconBlock : cdxIconUpload" />
                     {{ auth.isBlocked ? "Yükləmə qadağandır" : "Yeni şəkil yüklə" }}
                  </CdxButton>
                  <p v-if="auth.isBlocked" class="block-notice">
                     Hesabınız bloklandığı üçün şəkil yükləyə bilməzsiniz.
                  </p>
               </template>
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
            <MetadataSection
               :monument="monument"
               :coords-copied="coordsCopied"
               @copy-coords="(lat, lon) => $emit('copy-coords', lat, lon)"
            />
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
import { computed } from "vue";
import { CdxButton, CdxCard, CdxIcon, CdxInfoChip } from "@wikimedia/codex";
import {
   cdxIconBlock,
   cdxIconCheck,
   cdxIconClose,
   cdxIconLogIn,
   cdxIconLogoWikimediaCommons,
   cdxIconMapPin,
   cdxIconShare,
   cdxIconUpload,
} from "@wikimedia/codex-icons";
import HeroImage from "@/components/map/HeroImage.vue";
import MetadataSection from "@/components/map/MetadataSection.vue";
import { useAuthStore } from "@/stores/auth";
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
   inventoryCopied: boolean;
   coordsCopied: boolean;
   linkCopied: boolean;
}

const props = defineProps<Props>();
const auth = useAuthStore();

/**
 * Performance optimization: Extract template logic into computed properties.
 * This prevents expensive string manipulations and URL formatting on every re-render.
 */
const sortedInventory = computed(() => {
   if (!props.monument?.inventory) return [];
   return props.monument.inventory
      .split(",")
      .map((s) => s.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
});

const optimizedImageUrl = computed(() => {
   return props.monument?.image ? getOptimizedImage(props.monument.image, 500) : "";
});

const srcSetUrl = computed(() => {
   return props.monument?.image ? getSrcSet(props.monument.image, [250, 500, 960]) : "";
});

const descriptionPageUrl = computed(() => {
   return props.monument?.image ? getDescriptionPage(props.monument.image) : "";
});

const categoryUrl = computed(() => {
   return props.monument ? getCategoryUrl(props.monument) : "";
});

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

.action-button--success {
   color: var(--color-success, #14866d);
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

.block-notice {
   grid-column: span 2;
   margin-top: -0.25rem;
   font-size: 0.75rem;
   color: #d33;
   text-align: center;
   font-weight: 500;
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
