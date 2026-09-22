<template>
   <div class="flex h-full w-full flex-col items-center justify-center bg-white p-8 text-center">
      <div
         class="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
         :class="failures.length > 0 ? 'bg-amber-100' : 'bg-green-100'"
      >
         <font-awesome-icon
            v-if="failures.length === 0"
            :icon="['fas', 'check']"
            class="text-4xl text-green-600"
         />
         <font-awesome-icon
            v-else
            :icon="['fas', 'exclamation-triangle']"
            class="text-4xl text-amber-600"
         />
      </div>

      <h3 class="mb-2 text-2xl font-bold text-gray-900">
         {{ failures.length > 0 ? "Qismən yükləndi" : "Uğurla yükləndi!" }}
      </h3>
      <p class="mb-8 text-gray-500">
         <template v-if="failures.length === 0">
            {{ results.length }} fayl Vikianbara yükləndi.
         </template>
         <template v-else>
            {{ results.length }} fayl yükləndi, {{ failures.length }} fayl yüklənə bilmədi.
         </template>
      </p>

      <div
         v-if="results.length > 0"
         class="mb-8 w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-left"
      >
         <div class="max-h-60 overflow-y-auto">
            <div
               v-for="(res, idx) in results"
               :key="idx"
               class="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 last:border-0 hover:bg-gray-50"
            >
               <div class="flex items-center truncate">
                  <font-awesome-icon :icon="['far', 'image']" class="mr-3 text-gray-400" />
                  <span class="truncate text-sm font-medium text-gray-700" :title="res.filename">
                     {{ stripExtension(res.filename) }}
                  </span>
               </div>
               <a
                  :href="res.url"
                  target="_blank"
                  class="ml-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
               >
                  Bax
                  <font-awesome-icon :icon="['fas', 'external-link-alt']" class="ml-1 text-xs" />
               </a>
            </div>
         </div>
      </div>

      <div
         v-if="failures.length > 0"
         class="mb-8 w-full max-w-lg overflow-hidden rounded-xl border border-red-200 bg-red-50 text-left"
      >
         <div class="max-h-40 overflow-y-auto">
            <div
               v-for="(failure, idx) in failures"
               :key="idx"
               class="flex items-start border-b border-red-100 bg-white px-4 py-3 last:border-0"
            >
               <font-awesome-icon
                  :icon="['fas', 'exclamation-circle']"
                  class="mt-0.5 mr-3 text-red-500"
               />
               <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-gray-700" :title="failure.name">
                     {{ stripExtension(failure.name) }}
                  </div>
                  <div class="mt-0.5 text-xs text-red-600">{{ failure.message }}</div>
               </div>
            </div>
         </div>
      </div>

      <div class="flex space-x-4">
         <button
            class="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            @click="$emit('close')"
         >
            Bağla
         </button>
         <button
            v-if="failures.length > 0"
            class="flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isRetrying"
            @click="$emit('retry')"
         >
            <font-awesome-icon
               v-if="isRetrying"
               :icon="['fas', 'circle-notch']"
               spin
               class="text-sm"
            />
            {{ isRetrying ? "Yenidən cəhd edilir..." : "Yenidən cəhd et" }}
         </button>
         <button
            class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            @click="$emit('reset')"
         >
            Başqasını yüklə
         </button>
      </div>
   </div>
</template>

<script setup lang="ts">
import type { UploadFailure, UploadResult } from "@/utils/uploadService";

defineProps<{
   results: UploadResult[];
   failures: UploadFailure[];
   isRetrying: boolean;
}>();

defineEmits<{
   close: [];
   retry: [];
   reset: [];
}>();

const stripExtension = (name: string | undefined) => (name ?? "").replace(/\.[^/.]+$/, "");
</script>
