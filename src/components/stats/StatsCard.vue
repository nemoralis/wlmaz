<template>
   <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div class="text-sm font-medium text-gray-500">{{ title }}</div>
      <div class="mt-2 text-3xl font-bold" :class="colorClass">
         {{ value }}
      </div>
      <div v-if="subtext" class="mt-1 text-xs text-gray-400">{{ subtext }}</div>
   </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
   name: "StatsCard",
   props: {
      title: {
         type: String,
         required: true,
      },
      value: {
         type: [String, Number],
         required: true,
      },
      color: {
         type: String,
         default: "gray", // gray, green, red
      },
      subtext: {
         type: String,
         default: "",
      },
   },
   setup(props) {
      const colorClass = computed(() => {
         switch (props.color) {
            case "green":
               return "text-green-600";
            case "red":
               return "text-red-500";
            default:
               return "text-gray-900"; // Changed from gray-800 to match original mostly
         }
      });

      return { colorClass };
   },
});
</script>
