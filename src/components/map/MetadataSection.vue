<template>
   <CdxCard class="info-card">
      <template #title>Metadata</template>
      <template #supporting-text>
         <div class="info-section">
            <div v-if="monument.lat && monument.lon" class="info-group">
               <span class="info-group-label">Koordinatlar</span>
               <div class="gps-actions">
                  <CdxButton
                     weight="quiet"
                     class="gps-link-btn"
                     :title="isMobileViewport() ? 'Xəritə tətbiqində aç' : 'Google Maps-də aç'"
                     @click="
                        openExternalLink(
                           getCoordinatesUrl(monument.lat, monument.lon, isMobileViewport()),
                        )
                     "
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
</template>

<script setup lang="ts">
import { CdxButton, CdxCard, CdxIcon } from "@wikimedia/codex";
import {
   cdxIconCheck,
   cdxIconCopy,
   cdxIconLogoWikidata,
   cdxIconLogoWikipedia,
   cdxIconMapPin,
} from "@wikimedia/codex-icons";
import type { MonumentProps } from "@/types";
import { getCoordinatesUrl, isMobileViewport } from "@/utils/geoLinks";

interface Props {
   monument: MonumentProps;
   coordsCopied: boolean;
}

defineProps<Props>();

defineEmits<{
   "copy-coords": [lat: number, lon: number];
}>();

const openExternalLink = (url: string) => {
   if (url) {
      window.open(url, "_blank", "noopener");
   }
};
</script>

<style scoped>
.info-card {
   position: relative;
   border-radius: 0;
   border: none !important;
   box-shadow: none !important;
}

.info-card :deep(.cdx-card__text) {
   padding: 0 !important;
}

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
</style>
