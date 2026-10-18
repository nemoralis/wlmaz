<template>
   <div class="w-full">
      <p v-if="loadFailed" class="py-8 text-center text-sm text-gray-500">
         {{ REGIONS_MAP_ERROR }}
      </p>

      <div v-else-if="isLoading" class="py-16 text-center text-sm text-gray-400">Yüklənir...</div>

      <div v-else>
         <div class="mb-3 flex items-center gap-2">
            <span class="text-xs text-gray-500">{{ REGIONS_MAP_METRIC_CAPTION }}</span>
            <CdxSelect
               :menu-items="REGIONS_MAP_METRICS"
               :selected="activeMetric"
               :aria-label="REGIONS_MAP_METRIC_ARIA_LABEL"
               @update:selected="onMetricSelected"
            />
         </div>

         <div class="relative">
            <!--
               ECharts draws to canvas, so the chart is one image to assistive
               tech: it carries the map's label, while `RegionsPage.vue`'s region
               list below is the keyboard and screen-reader path to every region.
               All pointer interaction (click, drag, wheel, pinch) is ECharts'
               own `roam` handling.

               The height sits on the wrapper below, not on <VChart> itself:
               vue-echarts injects `x-vue-echarts { height: 100% }` as unlayered
               CSS, and unlayered rules beat Tailwind's `@layer utilities` at any
               specificity — height classes on the chart element would be ignored
               and the chart would initialise at zero height.
            -->
            <div class="h-[380px] sm:h-[540px]">
               <VChart
                  v-if="option"
                  ref="chartRef"
                  class="region-map"
                  role="img"
                  :aria-label="ariaLabel"
                  :option="option"
                  autoresize
                  @click="onChartClick"
                  @georoam="onRoam"
               />
            </div>

            <!-- Reset sits above the map. It is the pointer-free route back to
                 the whole-country view once a drag or a wheel has moved the map. -->
            <div class="absolute top-2 right-2 z-10">
               <CdxButton
                  :aria-label="REGIONS_MAP_RESET_LABEL"
                  :disabled="!hasRoamed"
                  @click="resetView"
               >
                  {{ REGIONS_MAP_RESET_SHORT }}
               </CdxButton>
            </div>
         </div>
      </div>

      <p v-if="!loadFailed && !isLoading" class="mt-3 text-xs text-gray-500">{{ hint }}</p>
   </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { CdxButton, CdxSelect } from "@wikimedia/codex";
import VChart from "vue-echarts";
import { registerMap, type EChartsType } from "echarts/core";
import "@/utils/echartsRegions";
import { useRegionsMap } from "@/composables/useRegionsMap";
import {
   regionAspectScale,
   regionMetricScale,
   regionMetricValue,
   regionPath,
   type RegionMetric,
} from "@/utils/regions";
import {
   REGIONS_MAP_ARIA_LABEL,
   REGIONS_MAP_ERROR,
   REGIONS_MAP_HINT,
   REGIONS_MAP_METRIC_ARIA_LABEL,
   REGIONS_MAP_METRIC_CAPTION,
   REGIONS_MAP_METRICS,
   REGIONS_MAP_RESET_LABEL,
   REGIONS_MAP_RESET_SHORT,
   REGIONS_MAP_TOOLTIP_COVERAGE,
   REGIONS_MAP_TOOLTIP_EMPTY,
   REGIONS_MAP_TOOLTIP_TOTAL,
} from "@/content/regions";

const props = withDefaults(
   defineProps<{
      /** Overrides the default hint line under the map. */
      hint?: string;
      ariaLabel?: string;
   }>(),
   { hint: "", ariaLabel: "" },
);

/** The name the built boundaries are registered under; `series.map` points at it. */
const MAP_NAME = "wlm-az-regions";

/** Coverage shading, 0% to 100%: near-white to the site's link blue. */
const COVERAGE_COLORS = ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e40af"];

/** The slice of the VChart component instance the reset action needs. */
interface ChartComponent {
   chart?: EChartsType;
}

const { load, payload, geoJson, isLoading, loadFailed, findRegion } = useRegionsMap();
const router = useRouter();

const metricLabel = computed(
   () => REGIONS_MAP_METRICS.find((option) => option.value === activeMetric.value)?.label ?? "",
);

const ariaLabel = computed(() => props.ariaLabel || REGIONS_MAP_ARIA_LABEL(metricLabel.value));
const hint = computed(() => props.hint || REGIONS_MAP_HINT);

const chartRef = ref<ChartComponent | null>(null);

/** Which number the map shades by; the select above the chart writes here. */
const activeMetric = ref<RegionMetric>("percent");

/**
 * Applies a metric the select emitted. Only a known id is taken, so a stray
 * value cannot leave the map shaded by one metric and labelled by another.
 */
const onMetricSelected = (value: string | number | null) => {
   const metric = REGIONS_MAP_METRICS.find((option) => option.value === value);
   if (metric) activeMetric.value = metric.value;
};

/**
 * Set once the payload's boundaries are registered. The chart cannot render
 * before that, and registration has to happen in this order: `registerMap`
 * first, then an option naming the map.
 */
const mapReady = ref(false);

watch(
   geoJson,
   (collection) => {
      mapReady.value = false;
      if (!collection) return;
      registerMap(MAP_NAME, collection);
      mapReady.value = true;
   },
   { immediate: true },
);

/** Whether the visitor has moved the map, so the reset button stays inert until then. */
const hasRoamed = ref(false);

const onRoam = () => {
   hasRoamed.value = true;
};

/**
 * Opens the clicked region's page.
 *
 * ECharts discards the click that ends a pan itself, so no drag guard is
 * needed here; the `findRegion` check keeps a stray name from navigating.
 */
const onChartClick = (params: unknown) => {
   const name = (params as { name?: unknown } | null)?.name;
   if (typeof name !== "string" || !name) return;

   const region = findRegion(name);
   if (!region) return;

   void router.push(regionPath(region.name));
};

/**
 * The hover line follows the active metric: its headline number is the one
 * the shading shows, and the photographed share stays in the parentheses in
 * both metrics, so a switch never hides information.
 */
const formatTooltip = (raw: unknown): string => {
   const params = raw as { name?: unknown; data?: unknown } | null;
   const name = typeof params?.name === "string" ? params.name : "";
   if (!name) return "";

   const data = params?.data as
      { total?: unknown; withPhoto?: unknown; value?: unknown } | null | undefined;
   const total = typeof data?.total === "number" ? data.total : 0;
   const withPhoto = typeof data?.withPhoto === "number" ? data.withPhoto : 0;
   const value = typeof data?.value === "number" ? data.value : null;

   // `null` is the marker both metrics use for "nothing recorded".
   if (value === null) return REGIONS_MAP_TOOLTIP_EMPTY(name);
   return activeMetric.value === "percent"
      ? REGIONS_MAP_TOOLTIP_COVERAGE(name, value, withPhoto, total)
      : REGIONS_MAP_TOOLTIP_TOTAL(name, value, withPhoto);
};

const option = computed(() => {
   const collection = geoJson.value;
   const regions = payload.value?.regions;
   if (!mapReady.value || !collection || !regions) return null;

   const metric = activeMetric.value;
   const scale = regionMetricScale(regions, metric);

   return {
      tooltip: {
         trigger: "item",
         confine: true,
         formatter: formatTooltip,
      },
      // The scale follows the active metric, and the chart is only ever
      // merged (`setOption` without `notMerge`), so switching metrics keeps
      // the visitor's pan and zoom — deliberately, to compare the same area.
      visualMap: {
         type: "continuous",
         min: scale.min,
         max: scale.max,
         left: 8,
         bottom: 8,
         itemWidth: 12,
         itemHeight: 110,
         text: scale.text,
         textStyle: { color: "#4b5563", fontSize: 11 },
         inRange: { color: COVERAGE_COLORS },
      },
      series: [
         {
            type: "map",
            map: MAP_NAME,
            roam: true,
            scaleLimit: { min: 1, max: 32 },
            aspectScale: regionAspectScale(collection),
            itemStyle: { areaColor: "#e5e7eb", borderColor: "#ffffff", borderWidth: 1 },
            emphasis: {
               label: {
                  show: true,
                  color: "#111827",
                  textBorderColor: "#ffffff",
                  textBorderWidth: 3,
               },
               itemStyle: { borderColor: "#2a4b8d", borderWidth: 2 },
            },
            data: regions.map((region) => ({
               name: region.name,
               // `null` means the region has no recorded monuments: it stays
               // out of the ramp in every metric and shows the neutral colour.
               value: regionMetricValue(region, metric),
               total: region.total,
               withPhoto: region.withPhoto,
            })),
         },
      ],
   };
});

/**
 * Drops the roam offset by rebuilding the chart's model from the same option.
 *
 * A plain `setOption` only merges, which keeps the current pan and zoom;
 * `notMerge` re-initialises the coordinate system, which is exactly the
 * "show the whole country again" this button promises.
 */
const resetView = () => {
   const chart = chartRef.value?.chart;
   const current = option.value;
   if (!chart || !current) return;

   chart.setOption(current, { notMerge: true });
   hasRoamed.value = false;
};

onMounted(() => {
   void load();
});
</script>

<style scoped>
/* zrender does not disable browser touch gestures on its canvas, so without
   this a drag on the map scrolls the page instead of roaming the map — the old
   SVG set the same property on the element itself. */
.region-map :deep(canvas) {
   touch-action: none;
}
</style>
