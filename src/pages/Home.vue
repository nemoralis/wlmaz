<template>
    <div class="h-full w-full relative">

        <div v-if="error"
            class="absolute inset-0 z-5000 bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div class="bg-white p-8 rounded-xl shadow-xl max-w-md border border-gray-200">
                <div
                    class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa fa-exclamation-triangle text-2xl"></i>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-2">Map could not be loaded</h2>
                <p class="text-gray-600 mb-6">
                    {{ error.message || "An unexpected error occurred while initializing the map." }}
                </p>
                <button @click="reload"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Reload page
                </button>
            </div>
        </div>

        <MonumentMap v-else />

    </div>
</template>

<script lang="ts" setup>
import { ref, onErrorCaptured } from "vue";
import MonumentMap from "../components/MonumentMap.vue";

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
    console.error("Map Error Captured:", err);
    error.value = err as Error;
    return false;
});

const reload = () => {
    window.location.reload();
};
</script>