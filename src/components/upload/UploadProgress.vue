<template>
   <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
   >
      <div class="w-full max-w-sm px-6 text-center">
         <div class="mb-6 inline-block">
            <font-awesome-icon
               :icon="['fas', 'circle-notch']"
               spin
               class="text-4xl text-blue-600"
               aria-hidden="true"
            />
         </div>

         <h3 class="mb-2 text-xl font-bold text-gray-900">Yüklənir...</h3>
         <p class="mb-6 text-sm text-gray-500">
            {{ currentIndex + 1 }} / {{ total }} şəkil yüklənir
         </p>

         <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
               class="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
               :style="{ width: `${progress}%` }"
               role="progressbar"
               :aria-valuenow="progress"
               aria-valuemin="0"
               aria-valuemax="100"
            ></div>
         </div>
         <div class="mt-2 text-right text-xs font-medium text-gray-400">{{ progress }}%</div>
         <span class="sr-only">Yükləmə: {{ progress }}%</span>

         <button
            class="mt-6 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            @click="$emit('cancel')"
         >
            Yükləməni dayandır
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
defineProps<{
   total: number;
   currentIndex: number;
   progress: number;
}>();

defineEmits<{
   cancel: [];
}>();
</script>
