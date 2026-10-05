<template>
   <div class="w-full">
      <!-- The map is one link per region. Using router-link means the href,
           keyboard activation, focus order, and middle-click all come from the
           router instead of being re-implemented by hand. -->
      <p v-if="loadFailed" class="py-8 text-center text-sm text-gray-500">
         {{ REGIONS_MAP_ERROR }}
      </p>

      <div v-else-if="isLoading" class="py-16 text-center text-sm text-gray-400">Yüklənir...</div>

      <div v-else class="relative">
         <svg
            ref="svgEl"
            :viewBox="viewBox"
            class="h-auto w-full select-none"
            :style="{ touchAction: 'none' }"
            role="group"
            :aria-label="ariaLabel"
            preserveAspectRatio="xMidYMid meet"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="endPointer"
            @pointercancel="endPointer"
            @focusin="onFocusIn"
         >
            <router-link
               v-for="region in regions"
               :key="region.name"
               v-slot="{ href, navigate }"
               :to="regionPath(region.name)"
               custom
            >
               <!-- Enter needs no handler: this is a real <a href>, so the browser
                    raises a click on Enter and `@click` routes it. -->
               <a
                  :href="href"
                  class="region-shape"
                  :aria-label="region.name"
                  @click="onRegionClick(navigate, $event)"
               >
                  <!-- Native SVG tooltip on hover. Not a focus tooltip: the
                       accessible name is on the link itself, so keyboard and
                       screen-reader users are covered by aria-label. -->
                  <title>{{ region.name }}</title>
                  <path
                     :d="region.path"
                     fill-rule="evenodd"
                     vector-effect="non-scaling-stroke"
                     class="region-fill"
                  />
               </a>
            </router-link>
         </svg>

         <!-- Zoom buttons sit above the map. They are the pointer-free route to
              every zoom level, so the map stays usable without a drag. -->
         <div
            class="absolute top-2 right-2 z-10 flex flex-col items-end gap-1"
            role="group"
            :aria-label="REGIONS_MAP_CONTROLS_LABEL"
         >
            <CdxButton
               :aria-label="REGIONS_MAP_ZOOM_IN_LABEL"
               :disabled="!canZoomIn"
               @click="zoomIn"
            >
               <CdxIcon :icon="cdxIconZoomIn" />
            </CdxButton>
            <CdxButton
               :aria-label="REGIONS_MAP_ZOOM_OUT_LABEL"
               :disabled="!canZoomOut"
               @click="zoomOut"
            >
               <CdxIcon :icon="cdxIconZoomOut" />
            </CdxButton>
            <CdxButton :aria-label="REGIONS_MAP_RESET_LABEL" :disabled="isReset" @click="reset">
               {{ REGIONS_MAP_RESET_SHORT }}
            </CdxButton>
         </div>
      </div>

      <p v-if="!loadFailed && !isLoading" class="mt-3 text-xs text-gray-500">{{ hint }}</p>
   </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CdxButton, CdxIcon } from "@wikimedia/codex";
import { cdxIconZoomIn, cdxIconZoomOut } from "@wikimedia/codex-icons";
import { useRegionsMap } from "@/composables/useRegionsMap";
import { regionPath } from "@/utils/regions";
import { createGestureTracker } from "@/utils/regionsMapGestures";
import {
   canZoomIn as canZoomInView,
   canZoomOut as canZoomOutView,
   initialMapView,
   isResetView,
   mapBaseOf,
   panBy,
   viewBoxFor,
   viewSize,
   windowCentre,
   wheelZoomFactor,
   ZOOM_STEP,
   zoomAt,
   type MapBase,
   type MapView,
} from "@/utils/regionsMapView";
import {
   REGIONS_MAP_ARIA_LABEL,
   REGIONS_MAP_CONTROLS_LABEL,
   REGIONS_MAP_ERROR,
   REGIONS_MAP_HINT,
   REGIONS_MAP_RESET_LABEL,
   REGIONS_MAP_RESET_SHORT,
   REGIONS_MAP_ZOOM_IN_LABEL,
   REGIONS_MAP_ZOOM_OUT_LABEL,
} from "@/content/regions";

const props = withDefaults(
   defineProps<{
      /** Overrides the default hint line under the map. */
      hint?: string;
      ariaLabel?: string;
   }>(),
   { hint: "", ariaLabel: "" },
);

const { load, payload, isLoading, loadFailed } = useRegionsMap();

const ariaLabel = computed(() => props.ariaLabel || REGIONS_MAP_ARIA_LABEL);
const hint = computed(() => props.hint || REGIONS_MAP_HINT);
const viewBox = computed(() => viewBoxFor(view.value, base.value));
const regions = computed(() => payload.value?.regions ?? []);

const svgEl = ref<SVGSVGElement | null>(null);

/**
 * The visible window.
 *
 * Starts at the whole country and is deliberately not persisted: coming back
 * from a region page remounts this component, so a visitor who zoomed into
 * Baku by accident is never left stuck there.
 */
const view = ref<MapView>(initialMapView());

/** The map's own extent, taken from the payload's viewBox rather than assumed. */
const base = computed<MapBase>(() => mapBaseOf(payload.value));

const isReset = computed(() => isResetView(view.value));
const canZoomIn = computed(() => canZoomInView(view.value));
const canZoomOut = computed(() => canZoomOutView(view.value));

/**
 * Tap-versus-drag state, owned by a tracker so the rule can be tested.
 *
 * The important part is that capture happens lazily, once a gesture is known to
 * be a drag. Capturing on `pointerdown` retargets the `click` at the `<svg>`,
 * which stops the region links navigating entirely.
 */
const gestures = createGestureTracker();

/**
 * Client px -> user units, via the SVG's own screen matrix.
 *
 * Reading the matrix on every event rather than caching a scale factor is what
 * makes this correct while the page scrolls or the viewport resizes: a cached
 * scale would silently drift the map against the cursor.
 */
const toUserPoint = (clientX: number, clientY: number) => {
   const svg = svgEl.value;
   const matrix = svg?.getScreenCTM();
   if (!svg || !matrix) return null;
   const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
   return { x: point.x, y: point.y };
};

/** Captures the given pointers so a drag survives leaving the map. */
const capturePointers = (ids: number[]) => {
   const svg = svgEl.value;
   if (!svg) return;
   for (const id of ids) {
      if (!svg.hasPointerCapture(id)) svg.setPointerCapture(id);
   }
};

/** Distance and midpoint of the two active pointers, for pinch. */
const pinchGeometry = () => {
   const [a, b] = gestures.points();
   if (!a || !b) return null;
   return {
      distance: Math.hypot(a.x - b.x, a.y - b.y),
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
   };
};

/** Units per px along each axis at the current view, for pinch midpoint panning. */
const unitsPerPixel = () => {
   const size = viewSize(view.value, base.value);
   const rect = svgEl.value?.getBoundingClientRect();
   if (!rect || !rect.width || !rect.height) return null;
   // Equal on both axes because the viewBox aspect is pinned to the element's.
   return { x: size.width / rect.width, y: size.height / rect.height };
};

/** Previous pinch geometry, so each move is a delta rather than an absolute. */
let previousPinch: ReturnType<typeof pinchGeometry> = null;

const zoomIn = () => {
   view.value = zoomAt(view.value, ZOOM_STEP, windowCentre(view.value, base.value), base.value);
};

const zoomOut = () => {
   view.value = zoomAt(view.value, 1 / ZOOM_STEP, windowCentre(view.value, base.value), base.value);
};

const reset = () => {
   view.value = initialMapView();
};

const onPointerDown = (event: PointerEvent) => {
   // Only the primary button drags. Right-click is left to the browser so the
   // existing context menu still works over the map.
   if (event.button !== 0) return;
   // Buttons and controls sit over the map and handle their own events.
   if ((event.target as Element | null)?.closest?.("button")) return;

   capturePointers(gestures.down(event.pointerId, { x: event.clientX, y: event.clientY }));

   const geometry = pinchGeometry();
   if (geometry) previousPinch = geometry;
};

const onPointerMove = (event: PointerEvent) => {
   const previous = gestures.at(event.pointerId);
   if (!previous) return;

   capturePointers(gestures.move(event.pointerId, { x: event.clientX, y: event.clientY }));

   const geometry = pinchGeometry();
   if (geometry && previousPinch) {
      // A zero separation (both fingers down on the same spot) has no direction
      // to scale along, so skip the ratio rather than dividing by it.
      const factor = previousPinch.distance > 0 ? geometry.distance / previousPinch.distance : 1;
      const anchor = toUserPoint(geometry.centre.x, geometry.centre.y);
      if (anchor && Number.isFinite(factor) && factor > 0) {
         view.value = zoomAt(view.value, factor, anchor, base.value);

         // Two fingers moving together pan as well as scale. The midpoint delta
         // is in client px, so it has to be converted at the post-zoom scale,
         // which is why this runs after `zoomAt` has already been applied.
         const units = unitsPerPixel();
         if (units) {
            view.value = panBy(
               view.value,
               -(geometry.centre.x - previousPinch.centre.x) * units.x,
               -(geometry.centre.y - previousPinch.centre.y) * units.y,
               base.value,
            );
         }
      }
      previousPinch = geometry;
      return;
   }

   const from = toUserPoint(previous.x, previous.y);
   const to = toUserPoint(event.clientX, event.clientY);
   if (!from || !to) return;

   // Dragging right must move the map right, hence the negation.
   view.value = panBy(view.value, to.x - from.x, to.y - from.y, base.value);
};

const endPointer = (event: PointerEvent) => {
   if (!gestures.at(event.pointerId)) return;

   gestures.up(event.pointerId);
   if (svgEl.value?.hasPointerCapture(event.pointerId)) {
      svgEl.value.releasePointerCapture(event.pointerId);
   }

   const remaining = gestures.size();
   if (remaining < 2) previousPinch = null;

   if (remaining === 0) {
      // Cleared on the next macrotask, after the click that follows this release
      // has already been dispatched. Otherwise the flag would still be set for
      // a genuine tap and the region would not open.
      setTimeout(() => {
         gestures.clearDrag();
      }, 0);
   }
};

/**
 * Brings a focused region into view.
 *
 * The browser cannot scroll an SVG viewBox, so tabbing to a region that has been
 * panned or zoomed out of frame would move focus to something invisible with no
 * focus ring anywhere on screen. Panning is the only thing that can fix that
 * without reaching for a data change.
 */
const onFocusIn = (event: FocusEvent) => {
   const link = event.target as SVGElement | null;
   const shape = link?.querySelector?.("path");
   if (!link || !shape || typeof shape.getBBox !== "function") return;

   const size = viewSize(view.value, base.value);
   // Already comfortably inside the window: leave the framing alone so tabbing
   // through a run of visible regions does not shift the map under the visitor.
   const margin = 0;
   const box = shape.getBBox();
   const visible =
      box.x >= view.value.x + margin &&
      box.y >= view.value.y + margin &&
      box.x + box.width <= view.value.x + size.width - margin &&
      box.y + box.height <= view.value.y + size.height - margin;
   if (visible) return;

   view.value = panBy(
      view.value,
      box.x + box.width / 2 - (view.value.x + size.width / 2),
      box.y + box.height / 2 - (view.value.y + size.height / 2),
      base.value,
   );
};

const onWheel = (event: WheelEvent) => {
   const factor = wheelZoomFactor(event.deltaY, event.deltaMode);
   if (!Number.isFinite(factor) || factor === 1) return;

   // Zoom about the cursor, which is what makes a wheel gesture feel anchored
   // rather than drifting toward the middle of the map.
   const anchor = toUserPoint(event.clientX, event.clientY) ?? windowCentre(view.value, base.value);
   const next = zoomAt(view.value, factor, anchor, base.value);

   // At a zoom limit there is nothing to do, and swallowing the event would
   // trap the visitor on a page they are trying to scroll off.
   if (next.zoom === view.value.zoom && next.x === view.value.x && next.y === view.value.y) return;

   event.preventDefault();
   view.value = next;
};

/**
 * Stops the click that ends a drag from navigating.
 *
 * The click is the last thing a drag produces, and without this every pan would
 * also open a region page.
 */
const onRegionClick = (navigate: (event: MouseEvent) => void, event: MouseEvent) => {
   if (gestures.isDrag()) {
      event.preventDefault();
      return;
   }
   navigate(event);
};

watch(
   svgEl,
   (next, previous) => {
      // The svg only exists once the payload has loaded, so the listener is
      // attached to the element rather than bound in the template. It has to be
      // non-passive, or `preventDefault` is ignored and the page scrolls instead.
      previous?.removeEventListener("wheel", onWheel);
      next?.addEventListener("wheel", onWheel, { passive: false });
   },
   { flush: "post" },
);

onBeforeUnmount(() => {
   svgEl.value?.removeEventListener("wheel", onWheel);
   gestures.reset();
});

onMounted(() => {
   void load();
});
</script>

<style scoped>
/* Stroke and fill live here rather than in Tailwind utilities so the hover
   transition stays on the element itself. Matches the map accent colour used
   by TablePage's links (#3366cc) and the app's neutral greys. */
.region-shape {
   cursor: pointer;
   outline: none;
}

/* Dragging and pinching are both panning the map, so the region cursor has to
   get out of the way or the map reads as a link rather than a surface. */
.region-shape:active {
   cursor: grabbing;
}

.region-fill {
   fill: #e5e7eb;
   stroke: #ffffff;
   stroke-width: 1;
   transition:
      fill 120ms ease,
      stroke 120ms ease;
}

.region-shape:hover .region-fill,
.region-shape:focus-visible .region-fill {
   fill: #3366cc;
   stroke: #2a4b8d;
}

.region-shape:focus-visible .region-fill {
   stroke-width: 2;
}
</style>
