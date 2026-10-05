<template>
   <!--
      Placeholder for the leaderboard while `/api/leaderboard/*` is in flight.
      Mirrors the real layout block for block (stat cards → chart → table →
      footer) so the swap to loaded content doesn't move anything.

      The wrapper classes below are copies of the ones in
      src/pages/LeaderboardPage.vue and the two chart components — they have to
      stay in sync or the content will jump when it arrives.
   -->
   <div role="status" aria-live="polite">
      <p class="mb-4 text-center text-sm text-gray-500">Məlumat yüklənir...</p>

      <!-- Event stat cards: matches the grid-cols-3 compact cards on the page. -->
      <div class="mb-6 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-3">
         <div
            v-for="n in STAT_CARDS"
            :key="n"
            class="flex flex-col items-center justify-center rounded-lg bg-white p-2 shadow-sm sm:flex-row sm:px-4 sm:py-2"
         >
            <div class="h-3 w-8 animate-pulse rounded bg-gray-200"></div>
            <div class="mt-1 h-3 w-10 animate-pulse rounded bg-gray-200 sm:mt-0 sm:ml-2"></div>
         </div>
      </div>

      <!--
         Chart placeholder. One block covers both views: the yearly breakdown
         and the daily chart differ only in data, and both render a 300px plot
         inside the same card shell.
      -->
      <div class="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
         <div class="mb-6 flex items-center justify-between">
            <div class="h-5 w-56 animate-pulse rounded bg-gray-200"></div>
            <div class="flex gap-2">
               <div class="h-6 w-20 animate-pulse rounded-full bg-gray-200"></div>
               <div class="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
            </div>
         </div>
         <div class="flex h-[300px] animate-pulse items-end gap-2 px-2">
            <div
               v-for="(height, index) in CHART_BARS"
               :key="index"
               class="flex-1 rounded-t bg-gray-200"
               :style="{ height: `${height}%` }"
            ></div>
         </div>
      </div>

      <!-- Leaderboard table: header row plus a handful of body rows. -->
      <div class="overflow-x-auto rounded-xl bg-white shadow-sm">
         <table class="w-full min-w-[600px] sm:min-w-full">
            <thead class="bg-gray-50">
               <tr>
                  <th class="px-6 py-4 text-left">
                     <div class="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
                  </th>
                  <th class="px-6 py-4 text-left">
                     <div class="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                  </th>
                  <th class="px-6 py-4 text-right">
                     <div class="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200"></div>
                  </th>
                  <th class="px-6 py-4 text-right">
                     <div class="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200"></div>
                  </th>
                  <th class="hidden px-6 py-4 text-right sm:table-cell">
                     <div class="ml-auto h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                  </th>
               </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
               <tr v-for="n in SKELETON_ROWS" :key="n">
                  <td class="px-6 py-4 whitespace-nowrap">
                     <div class="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                     <div
                        class="h-3 animate-pulse rounded bg-gray-200"
                        :class="USERNAME_WIDTHS[n - 1]"
                     ></div>
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap">
                     <div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200"></div>
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap">
                     <div class="ml-auto h-3 w-10 animate-pulse rounded bg-gray-200"></div>
                  </td>
                  <td class="hidden px-6 py-4 text-right whitespace-nowrap sm:table-cell">
                     <div class="ml-auto h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                  </td>
               </tr>
            </tbody>
         </table>

         <div class="border-t border-gray-100 bg-gray-50 px-6 py-3">
            <div class="h-3 w-36 animate-pulse rounded bg-gray-200"></div>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
/** One placeholder per stat card on the page (photos, participants, usage). */
const STAT_CARDS = [1, 2, 3];

/**
 * Bar heights for the chart placeholder, as percentages of the plot area.
 * Varied so the block reads as a chart rather than a flat slab.
 */
const CHART_BARS = [34, 52, 41, 63, 72, 48, 80, 58, 68, 44, 74, 52];

/**
 * Enough rows to read as a table — the real one can hold 150+ participants,
 * and drawing that many grey lines only adds noise while loading.
 */
const SKELETON_ROWS = 8;

/** Varied widths, so the rows don't look like a table of identical equals. */
const USERNAME_WIDTHS = ["w-28", "w-20", "w-32", "w-24", "w-36", "w-20", "w-28", "w-24"] as const;
</script>
