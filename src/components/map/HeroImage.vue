<template>
   <div class="hero-card">
      <template v-if="image">
         <div class="hero-image-container">
            <a :href="descriptionPageUrl" target="_blank" rel="noopener">
               <img
                  :key="image"
                  :src="optimizedUrl"
                  :srcset="srcSet"
                  sizes="(max-width: 768px) 100vw, 400px"
                  alt="Abidənin şəkli"
                  class="hero-image"
                  loading="lazy"
               />
            </a>
         </div>

         <div v-if="imageCredit" class="hero-credits">
            <span>© {{ imageCredit.author }}</span>
         </div>
      </template>

      <template v-else>
         <div class="no-image-container">
            <div class="no-image-placeholder">
               <CdxIcon :icon="cdxIconCamera" class="no-image-icon" />
               <span>Şəkil yoxdur</span>
            </div>
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex";
import { cdxIconCamera } from "@wikimedia/codex-icons";

interface Props {
   image: string;
   descriptionPageUrl: string;
   optimizedUrl: string;
   srcSet: string;
   imageCredit: { author: string; license: string } | null;
}

defineProps<Props>();
</script>

<style scoped>
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
</style>
