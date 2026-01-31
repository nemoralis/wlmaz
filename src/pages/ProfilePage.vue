<template>
   <div class="flex min-h-full flex-col bg-gray-50">
      <!-- Header -->
      <header class="border-b border-gray-200 bg-white px-4 py-6 sm:px-6">
         <div class="container mx-auto">
            <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
               <div class="flex items-center gap-4">
                  <div
                     class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-blue-600 shadow-sm"
                  >
                     <font-awesome-icon :icon="['fas', 'user']" class="text-2xl" />
                  </div>
                  <div>
                     <h1 class="text-2xl font-bold tracking-tight text-gray-900">
                        {{ auth.user?.username }}
                     </h1>
                     <div class="mt-1 flex flex-wrap items-center gap-2">
                        <p class="text-sm text-gray-500">Şəxsi profil və statistika</p>
                        <span v-if="stats?.commons?.registration" class="text-xs text-gray-400"
                           >•</span
                        >
                        <p v-if="stats?.commons?.registration" class="text-xs text-gray-400">
                           Vikianbarda {{ formattedCommonsRegDate }} tarixində qeydiyyatdan keçib
                        </p>
                     </div>
                     <!-- User Groups -->
                     <div v-if="stats?.commons?.groups" class="mt-2 flex flex-wrap gap-1">
                        <span
                           v-for="group in filteredGroups"
                           :key="group"
                           class="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-600"
                        >
                           {{ group }}
                        </span>
                     </div>
                  </div>
               </div>
               <div class="flex items-center gap-3">
                  <div v-if="stats?.commons?.editcount" class="hidden flex-col items-end sm:flex">
                     <span class="text-xs font-bold tracking-widest text-gray-400 uppercase"
                        >Redaktə sayı</span
                     >
                     <span class="text-lg font-bold text-gray-900">{{
                        stats.commons.editcount.toLocaleString()
                     }}</span>
                  </div>
                  <a
                     :href="commonsProfileUrl"
                     target="_blank"
                     rel="noopener"
                     class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                  >
                     <font-awesome-icon :icon="['fas', 'external-link-alt']" class="text-xs" />
                     Vikianbar profili
                  </a>
               </div>
            </div>
         </div>
      </header>

      <main class="container mx-auto flex-1 p-4 sm:p-6 lg:p-8">
         <!-- Loading State -->
         <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
            <font-awesome-icon
               :icon="['fas', 'spinner']"
               class="mb-4 animate-spin text-4xl text-blue-500"
            />
            <p class="font-medium text-gray-500">Statistikalarınız yüklənir...</p>
         </div>

         <!-- Error State -->
         <div
            v-else-if="error"
            class="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
         >
            <div
               class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500"
            >
               <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="text-2xl" />
            </div>
            <h2 class="mb-2 text-xl font-bold text-gray-900">Məlumat tapılmadı</h2>
            <p class="mb-6 text-gray-600">{{ error }}</p>
            <router-link
               to="/"
               class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
               <font-awesome-icon :icon="['fas', 'location-arrow']" />
               Xəritəyə qayıt
            </router-link>
         </div>

         <!-- Content -->
         <div v-else-if="stats" class="animate-in fade-in space-y-8 duration-500">
            <!-- Block Warning -->
            <div
               v-if="stats.commons?.blocked"
               class="flex flex-col gap-6 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm md:flex-row"
            >
               <div
                  class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
               >
                  <font-awesome-icon :icon="['fas', 'ban']" class="text-xl" />
               </div>
               <div class="space-y-2">
                  <h2 class="text-lg font-bold text-red-900">Hesabınız Vikianbarda bloklanıb</h2>
                  <p class="leading-relaxed text-red-700">
                     Vikianbardakı bloklanmısınız. Bu səbəbdən yeni fotoşəkillər yükləyə
                     bilməzsiniz.
                  </p>
                  <div class="mt-4 space-y-2 border-t border-red-200/50 pt-4">
                     <p v-if="stats.commons.blockreason" class="text-sm font-medium text-red-800">
                        <span class="font-bold opacity-60">Səbəb:</span>
                        <span class="italic" v-html="stats.commons.blockreason"></span>
                     </p>
                     <p v-if="stats.commons.blockexpiry" class="text-sm font-medium text-red-800">
                        <span class="font-bold opacity-60">Müddət:</span>
                        {{ stats.commons.blockexpiry }}
                     </p>
                  </div>
               </div>
            </div>
            <!-- Stats Summary Cards -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
               <div
                  class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
               >
                  <div class="mb-4 flex items-center justify-between">
                     <div
                        class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                     >
                        <font-awesome-icon :icon="['fas', 'image']" />
                     </div>
                     <span class="text-xs font-semibold tracking-wider text-gray-400 uppercase"
                        >Cəmi Foto</span
                     >
                  </div>
                  <div class="flex items-baseline gap-2">
                     <span class="text-3xl font-bold text-gray-900">{{ stats.total.count }}</span>
                     <span class="text-sm font-medium text-gray-500">ədəd</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-500">Müsabiqə çərçivəsində yüklənən şəkil</p>
               </div>

               <div
                  class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
               >
                  <div class="mb-4 flex items-center justify-between">
                     <div
                        class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600"
                     >
                        <font-awesome-icon :icon="['fas', 'file-signature']" />
                     </div>
                     <span class="text-xs font-semibold tracking-wider text-gray-400 uppercase"
                        >İstifadə</span
                     >
                  </div>
                  <div class="flex items-baseline gap-2">
                     <span class="text-3xl font-bold text-gray-900">{{ stats.total.usage }}</span>
                     <span class="text-sm font-medium text-gray-500">məqalə</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-500">Vikipediyada istifadə olunan fotolar</p>
               </div>

               <div
                  class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
               >
                  <div class="mb-4 flex items-center justify-between">
                     <div
                        class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600"
                     >
                        <font-awesome-icon :icon="['fas', 'chart-pie']" />
                     </div>
                     <span class="text-xs font-semibold tracking-wider text-gray-400 uppercase"
                        >İstifadə nisbəti</span
                     >
                  </div>
                  <div class="flex items-baseline gap-2">
                     <span class="text-3xl font-bold text-gray-900">{{ usageRate }}%</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-500">
                     Yüklənmiş şəkillərin məqalələrdə istifadə faizi
                  </p>
               </div>

               <div
                  class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
               >
                  <div class="mb-4 flex items-center justify-between">
                     <div
                        class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                     >
                        <font-awesome-icon :icon="['fas', 'pen-to-square']" />
                     </div>
                     <span class="text-xs font-semibold tracking-wider text-gray-400 uppercase"
                        >Redaktə sayı</span
                     >
                  </div>
                  <div class="flex items-baseline gap-2">
                     <span class="text-3xl font-bold text-gray-900">{{
                        stats.commons?.editcount?.toLocaleString() || "0"
                     }}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-500">
                     Vikimedia Commons layihəsində ümumi fəaliyyət
                  </p>
               </div>
            </div>

            <div
               v-if="stats.total.yearly && Object.keys(stats.total.yearly).length > 0"
               class="animate-in fade-in duration-700"
            >
               <YearlyBreakdownChart
                  :yearly-data="stats.total.yearly"
                  title="Müsabiqə illəri üzrə fəaliyyət"
               />
            </div>
         </div>
      </main>

      <!-- Footer Decoration -->
      <div class="h-1 bg-gradient-to-r from-blue-400 via-[#3366cc] to-purple-500"></div>
   </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted } from "vue";
import { useUserStats } from "../composables/useUserStats";
import { useAuthStore } from "../stores/auth";

const YearlyBreakdownChart = defineAsyncComponent(
   () => import("../components/stats/YearlyBreakdownChart.vue"),
);

const auth = useAuthStore();
const { stats, isLoading, error, fetchUserStats } = useUserStats();

const commonsProfileUrl = computed(() => {
   return `https://commons.wikimedia.org/wiki/User:${auth.user?.username}`;
});

const usageRate = computed(() => {
   if (!stats.value || stats.value.total.count === 0) return 0;
   return Math.round((stats.value.total.usage / stats.value.total.count) * 100);
});

const formattedCommonsRegDate = computed(() => {
   if (!stats.value?.commons?.registration) return "";
   const date = new Date(stats.value.commons.registration);
   return date.toLocaleDateString("az-AZ", { year: "numeric", month: "long", day: "numeric" });
});

const filteredGroups = computed(() => {
   return (stats.value?.commons?.groups || []).filter((g) => g !== "*");
});

onMounted(() => {
   if (auth.user?.username) {
      fetchUserStats(auth.user.username);
   } else {
      error.value = "İstifadəçi məlumatları tapılmadı. Zəhmət olmasa daxil olun.";
   }
});
</script>

<style scoped>
.animate-in {
   animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
   from {
      opacity: 0;
      transform: translateY(10px);
   }

   to {
      opacity: 1;
      transform: translateY(0);
   }
}
</style>
