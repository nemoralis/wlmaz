<template>
   <div class="flex min-h-full flex-col items-center justify-center bg-gray-50 px-4">
      <div class="w-full max-w-md text-center">
         <!-- 404 Visual -->
         <div class="relative mb-8 select-none">
            <span
               class="block bg-gradient-to-b from-gray-200 to-gray-100 bg-clip-text text-[10rem] leading-none font-black text-transparent"
            >
               404
            </span>
            <div
               class="absolute inset-0 flex items-center justify-center"
            >
               <div
                  class="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-50 shadow-lg"
               >
                  <font-awesome-icon
                     :icon="['fas', 'map-pin']"
                     class="text-3xl text-blue-500"
                     aria-hidden="true"
                  />
               </div>
            </div>
         </div>

         <h1 class="mb-3 text-2xl font-bold tracking-tight text-gray-900">
            Səhifə tapılmadı
         </h1>
         <p class="mb-8 text-gray-500">
            Axtardığınız səhifə mövcud deyil və ya köçürülmüş ola bilər.
         </p>

         <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <router-link
               to="/"
               class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#3366cc] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a4b8d] sm:w-auto"
            >
               <font-awesome-icon :icon="['fas', 'map']" class="text-xs" aria-hidden="true" />
               Xəritəyə qayıt
            </router-link>
            <router-link
               to="/about"
               class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:w-auto"
            >
               Haqqında
            </router-link>
         </div>
      </div>

      <p class="mt-16 text-xs text-gray-400">
         Xəta kodu: 404 · {{ currentPath }}
      </p>
   </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@unhead/vue";

const route = useRoute();
const currentPath = computed(() => route.fullPath);

useHead({
   title: "404 - Səhifə tapılmadı | Viki Abidələri Sevir Azərbaycan",
   link: [
      {
         rel: "canonical",
         href: "https://wikilovesmonuments.az/",
      },
   ],
   meta: [
      {
         name: "robots",
         content: "noindex, nofollow",
      },
      {
         name: "description",
         content: "Axtardığınız səhifə tapılmadı.",
      },
   ],
});
</script>
