<template>
   <div class="flex h-full flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-white p-4 shadow-sm">
         <div class="container mx-auto flex items-center justify-between">
            <h1 class="text-xl font-bold text-gray-800">
               <font-awesome-icon :icon="['fas', 'trophy']" class="mr-2 text-amber-500" />
               Liderlik cədvəli
            </h1>
            <router-link
               to="/"
               class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
               <font-awesome-icon :icon="['fas', 'arrow-left']" /> Xəritəyə qayıt
            </router-link>
         </div>
      </div>

      <div class="container mx-auto flex-1 overflow-y-auto p-4 sm:p-6">
         <!-- Year Selector & Stats -->
         <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
               <label for="year-select" class="text-sm font-medium text-gray-700">İl seçin:</label>
               <div class="flex items-center gap-2">
                  <select
                     id="year-select"
                     v-model="selectedYear"
                     class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                     @change="onYearChange"
                  >
                     <option value="total">Bütün illər</option>
                     <option v-for="year in availableYears" :key="year" :value="year">
                        {{ year }}
                     </option>
                  </select>
                  <div v-if="isValidating" class="h-4 w-4 flex-shrink-0">
                     <div
                        class="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
                     ></div>
                  </div>
               </div>
            </div>

            <!-- Event Stats Cards (Compact) -->
            <div
               v-if="eventStats && !isLoading"
               class="grid grid-cols-3 gap-1.5 text-[10px] sm:flex sm:flex-wrap sm:gap-3 sm:text-sm"
            >
               <div
                  class="flex flex-col items-center justify-center rounded-lg bg-white p-2 text-center shadow-sm sm:flex-row sm:px-4 sm:py-2"
               >
                  <span class="text-gray-500 sm:mr-2">Şəkil:</span>
                  <span class="font-bold text-gray-800">{{
                     eventStats.totalPhotos.toLocaleString()
                  }}</span>
               </div>
               <div
                  class="flex flex-col items-center justify-center rounded-lg bg-white p-2 text-center shadow-sm sm:flex-row sm:px-4 sm:py-2"
               >
                  <span class="text-gray-500 sm:mr-2">İştirakçı:</span>
                  <span class="font-bold text-gray-800">{{ eventStats.totalUsers }}</span>
               </div>
               <div
                  class="flex flex-col items-center justify-center rounded-lg bg-white p-2 text-center shadow-sm sm:flex-row sm:px-4 sm:py-2"
               >
                  <span class="text-gray-500 sm:mr-2">İstifadə:</span>
                  <span class="font-bold text-green-600">{{
                     eventStats.photosUsed.toLocaleString()
                  }}</span>
               </div>
            </div>
         </div>

         <!-- Yearly Breakdown Chart -->
         <div
            v-if="selectedYear === 'total' && yearlyBreakdown && !isLoading"
            class="animate-in fade-in mb-8 duration-700"
         >
            <YearlyBreakdownChart
               :yearly-data="yearlyBreakdown"
               title="Müsabiqədə illər üzrə iştirak"
            />
         </div>

         <!-- Loading State -->
         <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
            <div
               class="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
            ></div>
            <p class="mt-4 text-gray-500">Məlumat yüklənir...</p>
         </div>

         <!-- Error State -->
         <div
            v-else-if="error"
            class="flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm"
         >
            <font-awesome-icon
               :icon="['fas', 'exclamation-circle']"
               class="mb-4 text-4xl text-red-400"
            />
            <p class="mb-4 text-gray-600">{{ error }}</p>
            <button
               class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
               @click="fetchLeaderboard()"
            >
               Yenidən cəhd et
            </button>
         </div>

         <!-- Leaderboard Table -->
         <div v-else-if="users.length > 0" class="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table class="w-full min-w-[600px] sm:min-w-full">
               <thead class="bg-gray-50">
                  <tr>
                     <th
                        class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                     >
                        Sıra
                     </th>
                     <th
                        class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
                     >
                        İstifadəçi
                     </th>
                     <th
                        class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase"
                     >
                        Şəkil sayı
                     </th>
                     <th
                        class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase"
                     >
                        İstifadə edilən
                     </th>
                     <th
                        class="hidden px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase sm:table-cell"
                     >
                        Qeydiyyat tarixi
                     </th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-gray-100">
                  <tr
                     v-for="user in users"
                     :key="user.username"
                     class="transition-colors hover:bg-gray-50"
                     :class="{
                        'bg-amber-50': user.rank === 1,
                        'bg-gray-100': user.rank === 2,
                        'bg-orange-50': user.rank === 3,
                     }"
                  >
                     <!-- Rank -->
                     <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-2">
                           <span v-if="user.rank === 1" class="text-2xl">🥇</span>
                           <span v-else-if="user.rank === 2" class="text-2xl">🥈</span>
                           <span v-else-if="user.rank === 3" class="text-2xl">🥉</span>
                           <span
                              v-else
                              class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600"
                           >
                              {{ user.rank }}
                           </span>
                        </div>
                     </td>

                     <!-- Username -->
                     <td class="px-6 py-4 whitespace-nowrap">
                        <a
                           :href="`https://commons.wikimedia.org/wiki/User:${encodeURIComponent(user.username)}`"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="font-medium text-[#3366cc] hover:underline"
                        >
                           {{ user.username }}
                        </a>
                     </td>

                     <!-- Photo Count -->
                     <td class="px-6 py-4 text-right whitespace-nowrap">
                        <span class="font-semibold text-gray-900">{{
                           user.count.toLocaleString()
                        }}</span>
                     </td>

                     <!-- Usage Count -->
                     <td class="px-6 py-4 text-right whitespace-nowrap">
                        <span class="text-green-600">{{ user.usage.toLocaleString() }}</span>
                     </td>

                     <!-- Registration Date -->
                     <td
                        class="hidden px-6 py-4 text-right text-sm whitespace-nowrap text-gray-500 sm:table-cell"
                     >
                        {{ formatDate(user.reg) }}
                     </td>
                  </tr>
               </tbody>
            </table>

            <!-- Footer -->
            <div class="border-t border-gray-100 bg-gray-50 px-6 py-3 text-sm text-gray-500">
               Cəmi: {{ users.length }} iştirakçı
            </div>
         </div>

         <!-- Empty State -->
         <div
            v-else
            class="flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm"
         >
            <font-awesome-icon :icon="['fas', 'users']" class="mb-4 text-4xl text-gray-300" />
            <p class="text-gray-500">Bu il üçün iştirakçı tapılmadı</p>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, onMounted } from "vue";
import { useHead } from "@unhead/vue";
import { useLeaderboard } from "../composables/useLeaderboard";

const YearlyBreakdownChart = defineAsyncComponent(
   () => import("../components/stats/YearlyBreakdownChart.vue"),
);

const {
   users,
   isLoading,
   isValidating,
   error,
   selectedYear,
   availableYears,
   eventStats,
   yearlyBreakdown,
   fetchLeaderboard,
} = useLeaderboard();

const onYearChange = () => {
   fetchLeaderboard(selectedYear.value);
};

const formatDate = (date: Date): string => {
   return date.toLocaleDateString("az-AZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
   });
};

onMounted(() => {
   fetchLeaderboard();
});

useHead({
   title: "Liderlik cədvəli - Viki Abidələri Sevir Azərbaycan",
   link: [
      {
         rel: "canonical",
         href: "https://wikilovesmonuments.az/leaderboard",
      },
   ],
   meta: [
      {
         name: "description",
         content:
            "Wiki Loves Monuments Azərbaycan müsabiqəsinin liderlik cədvəli. Ən çox şəkil yükləyən iştirakçıların siyahısı.",
      },
   ],
});
</script>
