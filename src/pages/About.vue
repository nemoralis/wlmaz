<template>
   <div class="min-h-full bg-gray-50 pb-12">
      <!-- Hero Section -->
      <div class="bg-white border-b border-gray-200">
         <div class="container mx-auto px-4 py-8">
             <div class="flex items-center justify-between">
                <h1 class="text-3xl font-bold text-gray-900">Layihə Haqqında</h1>
                <router-link to="/" class="text-blue-600 hover:underline">
                   <i class="fa-solid fa-arrow-left mr-1"></i> Xəritəyə qayıt
                </router-link>
             </div>
         </div>
      </div>

      <div class="container mx-auto px-4 mt-8 max-w-4xl">
         
         <!-- Main Content -->
         <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
            <section>
               <h2 class="text-2xl font-bold text-gray-800 mb-4">Viki Abidələri Sevir (Wiki Loves Monuments)</h2>
               <p class="text-gray-600 leading-relaxed text-lg">
                  <strong class="text-blue-600">Wiki Loves Monuments</strong> hər il sentyabr ayında keçirilən beynəlxalq fotoşəkil müsabiqəsidir. Müsabiqənin məqsədi ölkələrin mədəni irs abidələrinin fotoşəkillərini toplamaq və onları <a href="https://commons.wikimedia.org" target="_blank" class="text-blue-600 hover:underline">Wikimedia Commons</a> layihəsinə yükləməklə sərbəst istifadəyə verməkdir.
               </p>
               <p class="mt-4 text-gray-600 leading-relaxed text-lg">
                  Bu xəritə layihəsi (WLM Azerbaijan Map) Azərbaycandakı abidələri vizuallaşdırmaq və könüllülərə hələ şəkli olmayan abidələri tapmaqda kömək etmək üçün yaradılmışdır.
               </p>
            </section>

            <section class="border-t border-gray-100 pt-6">
               <h2 class="text-2xl font-bold text-gray-800 mb-6">Necə iştirak etməli?</h2>
               
               <div class="grid md:grid-cols-3 gap-6">
                   <div class="text-center p-4 rounded-lg bg-gray-50">
                       <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                          <i class="fa-solid fa-map-location-dot"></i>
                       </div>
                       <h3 class="font-bold text-gray-900 mb-2">Abidəni tap</h3>
                       <p class="text-sm text-gray-600">Xəritədə <span class="text-red-500 font-bold">qırmızı</span> rəngli markerlər şəkli olmayan abidələri göstərir. Onlardan birini seçin.</p>
                   </div>
                   
                   <div class="text-center p-4 rounded-lg bg-gray-50">
                       <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                          <i class="fa-solid fa-camera"></i>
                       </div>
                       <h3 class="font-bold text-gray-900 mb-2">Şəklini çək</h3>
                       <p class="text-sm text-gray-600">Abidənin yerləşdiyi ünvana gedin və onun keyfiyyətli fotoşəkillərini çəkin.</p>
                   </div>

                   <div class="text-center p-4 rounded-lg bg-gray-50">
                       <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
                          <i class="fa-solid fa-cloud-arrow-up"></i>
                       </div>
                       <h3 class="font-bold text-gray-900 mb-2">Yüklə</h3>
                       <p class="text-sm text-gray-600">Şəkilləri birbaşa xəritə üzərindən və ya Wikimedia Commons vasitəsilə yükləyin.</p>
                   </div>
               </div>
            </section>

            <section class="border-t border-gray-100 pt-6">
               <h2 class="text-xl font-bold text-gray-800 mb-2">Məlumat mənbəsi</h2>
               <p class="text-gray-600">
                  Bu xəritədəki bütün məlumatlar <a href="https://wikidata.org" class="text-blue-600 hover:underline">Wikidata</a> bazasından gündəlik yenilənmə ilə götürülür. Xəritə OpenStreetMap (Google Maps seçimi də var) əsaslıdır.
               </p>
            </section>
         </div>
         
         <!-- Footer Credits -->
         <div class="mt-8 text-center text-gray-500 text-sm">
            <p class="mb-2">
               <a href="https://neriman.me" target="_blank" class="text-blue-600 font-medium hover:underline">Nəriman</a> tərəfindən ❤️ ilə hazırlanıb.
            </p>
            <p>
               Mənbə kodu: <a href="https://github.com/nemoralis/wlmaz" target="_blank" class="text-blue-600 hover:underline"><i class="fa-brands fa-github"></i> GitHub</a>
            </p>
            <p class="mt-4 text-xs text-gray-400">
               &copy; 2025 Viki Abidələri Sevir Azərbaycan
            </p>
         </div>

      </div>
   </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
   name: "AboutPage",
});
</script>
