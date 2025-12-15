<template>
   <div class="min-h-full bg-gray-50 pb-12">
      <!-- Hero Section -->
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-8">
            <div class="flex items-center justify-between">
               <h1 class="text-3xl font-bold text-gray-900">Layihə haqqında</h1>
               <router-link to="/" class="text-blue-600 hover:underline">
                  <i class="fa-solid fa-arrow-left mr-1"></i> Xəritəyə qayıt
               </router-link>
            </div>
         </div>
      </div>

      <div class="container mx-auto mt-8 max-w-4xl px-4">
         <!-- Main Content -->
         <div class="space-y-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
            <section>
               <h2 class="mb-4 text-2xl font-bold text-gray-800">
                  Viki Abidələri Sevir (Wiki Loves Monuments)
               </h2>
               <p class="text-lg leading-relaxed text-gray-600">
                  <strong class="text-blue-600">Wiki Loves Monuments</strong> hər il sentyabr ayında
                  keçirilən beynəlxalq fotoşəkil müsabiqəsidir. Müsabiqənin məqsədi ölkələrin mədəni
                  irs abidələrinin fotoşəkillərini toplamaq və onları
                  <a
                     href="https://commons.wikimedia.org"
                     target="_blank"
                     class="text-blue-600 hover:underline"
                     >Wikimedia Commons</a
                  >
                  layihəsinə yükləməklə sərbəst istifadəyə verməkdir.
               </p>
               <p class="mt-4 text-lg leading-relaxed text-gray-600">
                  Bu xəritə layihəsi (WLM Azerbaijan Map) Azərbaycandakı abidələri vizuallaşdırmaq
                  və könüllülərə hələ şəkli olmayan abidələri tapmaqda kömək etmək üçün
                  yaradılmışdır.
               </p>
            </section>

            <section class="border-t border-gray-100 pt-6">
               <h2 class="mb-6 text-2xl font-bold text-gray-800">Necə iştirak etməli?</h2>

               <div class="grid gap-6 md:grid-cols-3">
                  <div class="rounded-lg bg-gray-50 p-4 text-center">
                     <div
                        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600"
                     >
                        <i class="fa-solid fa-map-location-dot"></i>
                     </div>
                     <h3 class="mb-2 font-bold text-gray-900">Abidəni tap</h3>
                     <p class="text-sm text-gray-600">
                        Xəritədə <span class="font-bold text-red-500">qırmızı</span> rəngli
                        markerlər şəkli olmayan abidələri göstərir. Onlardan birini seçin.
                     </p>
                  </div>

                  <div class="rounded-lg bg-gray-50 p-4 text-center">
                     <div
                        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-600"
                     >
                        <i class="fa-solid fa-camera"></i>
                     </div>
                     <h3 class="mb-2 font-bold text-gray-900">Şəklini çək</h3>
                     <p class="text-sm text-gray-600">
                        Abidənin yerləşdiyi ünvana gedin və onun keyfiyyətli fotoşəkillərini çəkin.
                     </p>
                  </div>

                  <div class="rounded-lg bg-gray-50 p-4 text-center">
                     <div
                        class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl text-green-600"
                     >
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                     </div>
                     <h3 class="mb-2 font-bold text-gray-900">Yüklə</h3>
                     <p class="text-sm text-gray-600">
                        Şəkilləri birbaşa xəritə üzərindən və ya Wikimedia Commons vasitəsilə
                        yükləyin.
                     </p>
                  </div>
               </div>
            </section>

            <section class="border-t border-gray-100 pt-6">
               <h2 class="mb-2 text-xl font-bold text-gray-800">Məlumat mənbəsi</h2>
               <p class="text-gray-600">
                  Bu xəritədəki bütün məlumatlar
                  <a href="https://wikidata.org" class="text-blue-600 hover:underline">Wikidata</a>
                  bazasından gündəlik yenilənmə ilə götürülür. Xəritə OpenStreetMap (Google Maps
                  seçimi də var) əsaslıdır.
               </p>
            </section>
         </div>

         <!-- Footer Credits -->
         <div class="mt-8 text-center text-sm text-gray-500">
            <p class="mb-2">
               <a
                  href="https://neriman.me"
                  target="_blank"
                  class="font-medium text-blue-600 hover:underline"
                  >Nəriman</a
               >
               tərəfindən ❤️ ilə hazırlanıb.
            </p>
            <p>
               Mənbə kodu:
               <a
                  href="https://github.com/nemoralis/wlmaz"
                  target="_blank"
                  class="text-blue-600 hover:underline"
                  ><i class="fa-brands fa-github"></i> GitHub</a
               >
            </p>
            <p class="mt-4 text-xs text-gray-400">&copy; 2025 Viki Abidələri Sevir Azərbaycan</p>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { useHead } from "@unhead/vue";
import { schemaToJsonLd, useBreadcrumbSchema } from "../composables/useSchemaOrg";

const breadcrumbSchema = useBreadcrumbSchema([
   { name: "Ana Səhifə", url: "https://wikilovesmonuments.az/" },
   { name: "Haqqında", url: "https://wikilovesmonuments.az/about" },
]);

useHead({
   title: "Haqqında - Wiki Loves Monuments Azərbaycan | Viki Abidələri Sevir",
   link: [
      {
         rel: "canonical",
         href: "https://wikilovesmonuments.az/about",
      },
   ],
   meta: [
      {
         name: "description",
         content:
            "Wiki Loves Monuments Azərbaycan - beynəlxalq foto müsabiqəsi. Azərbaycanın mədəni irs abidələrinin fotoşəkillərini toplayın, Wikimedia Commons-a yükləyin və müsabiqədə iştirak edin.",
      },
   ],
   script: [
      {
         type: "application/ld+json",
         innerHTML: schemaToJsonLd(breadcrumbSchema),
      },
   ],
});
</script>
