<template>
   <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 class="mb-3 font-bold text-gray-700">Xəritə Legenda</h3>
      <div class="space-y-3">
         <div class="flex items-center gap-3">
            <div
               class="h-[30px] w-[30px] rounded-full border-2 border-white shadow-sm"
               style="background-color: #ef4444"
               aria-hidden="true"
            ></div>
            <span class="text-sm font-medium text-gray-600">Şəkli yoxdur</span>
         </div>
         <div class="flex items-center gap-3">
            <div
               class="h-[30px] w-[30px] rounded-full border-2 border-white shadow-sm"
               style="background-color: #10b981"
               aria-hidden="true"
            ></div>
            <span class="text-sm font-medium text-gray-600">Şəkli var</span>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
// Simple presentational component - no logic needed
</script>
