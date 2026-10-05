import { describe, expect, it } from "vitest";
import {
   canZoomIn,
   canZoomOut,
   clampView,
   clampZoom,
   initialMapView,
   isResetView,
   mapBaseFromViewBox,
   mapBaseOf,
   MAX_MAP_ZOOM,
   MIN_MAP_ZOOM,
   normalizeWheelDelta,
   panBy,
   viewBoxFor,
   viewSize,
   WHEEL_ZOOM_RATE,
   wheelZoomFactor,
   windowCentre,
   ZOOM_STEP,
   zoomAt,
   type MapBase,
   type MapView,
} from "@/utils/regionsMapView.ts";

const BASE: MapBase = { width: 1000, height: 757 };
const CENTRE: MapView = { x: 400, y: 300, zoom: 4 };

/** Where a user-unit point sits within the visible window, 0..1 on each axis. */
const relativePosition = (view: MapView, point: { x: number; y: number }) => {
   const size = viewSize(view, BASE);
   return { x: (point.x - view.x) / size.width, y: (point.y - view.y) / size.height };
};

describe("clampZoom", () => {
   it("keeps zoom within the supported range", () => {
      expect(clampZoom(1)).toBe(1);
      expect(clampZoom(0.5)).toBe(MIN_MAP_ZOOM);
      expect(clampZoom(0)).toBe(MIN_MAP_ZOOM);
      expect(clampZoom(-4)).toBe(MIN_MAP_ZOOM);
      expect(clampZoom(1000)).toBe(MAX_MAP_ZOOM);
      expect(clampZoom(8)).toBe(8);
   });

   it("falls back to the minimum for unusable input", () => {
      for (const bad of [NaN, Infinity, -Infinity]) expect(clampZoom(bad)).toBe(MIN_MAP_ZOOM);
   });
});

describe("mapBaseFromViewBox", () => {
   it("takes the width and height from the payload's viewBox", () => {
      expect(mapBaseFromViewBox("0 0 1000 757")).toEqual(BASE);
   });

   it("tolerates commas and extra whitespace", () => {
      expect(mapBaseFromViewBox("  0,0,640,480 ")).toEqual({ width: 640, height: 480 });
   });

   it("falls back to the real country's extent when unusable", () => {
      for (const bad of [undefined, null, "", "0 0 1000", "nonsense"]) {
         expect(mapBaseFromViewBox(bad)).toEqual(BASE);
      }
   });

   it("replaces a zero or negative extent rather than dividing by it", () => {
      expect(mapBaseFromViewBox("0 0 0 757")).toEqual(BASE);
      expect(mapBaseFromViewBox("0 0 1000 -5")).toEqual(BASE);
   });

   it("reads the base straight off a payload", () => {
      expect(mapBaseOf({ viewBox: "0 0 640 480" })).toEqual({ width: 640, height: 480 });
      expect(mapBaseOf(null)).toEqual(BASE);
   });
});

describe("viewSize", () => {
   it("divides the map by the zoom", () => {
      expect(viewSize({ x: 0, y: 0, zoom: 1 }, BASE)).toEqual(BASE);
      expect(viewSize({ x: 0, y: 0, zoom: 2 }, BASE)).toEqual({ width: 500, height: 378.5 });
      expect(viewSize({ x: 0, y: 0, zoom: 32 }, BASE)).toEqual({ width: 31.25, height: 23.65625 });
   });
});

describe("clampView", () => {
   it("pins the whole country in place at 1x", () => {
      expect(clampView({ x: 500, y: 400, zoom: 1 }, BASE)).toEqual({ x: 0, y: 0, zoom: 1 });
   });

   it("stops the window leaving the map", () => {
      const clamped = clampView({ x: 99999, y: -99999, zoom: 2 }, BASE);
      expect(clamped).toEqual({ x: 500, y: 0, zoom: 2 });

      expect(clampView({ x: -99999, y: 99999, zoom: 2 }, BASE)).toEqual({
         x: 0,
         y: 757 - 378.5,
         zoom: 2,
      });
   });

   it("leaves a legal view alone", () => {
      expect(clampView(CENTRE, BASE)).toEqual(CENTRE);
   });

   it("clamps the zoom while keeping the offset legal", () => {
      expect(clampView({ x: 400, y: 300, zoom: 999 }, BASE)).toEqual({ x: 400, y: 300, zoom: 32 });
   });

   it("never emits NaN from bad input", () => {
      const clamped = clampView({ x: NaN, y: NaN, zoom: NaN }, BASE);
      expect(clamped).toEqual({ x: 0, y: 0, zoom: 1 });
      for (const value of Object.values(clamped)) expect(Number.isFinite(value)).toBe(true);
   });
});

describe("panBy", () => {
   it("moves the window and cannot escape the map", () => {
      expect(panBy(CENTRE, 50, -25, BASE)).toEqual({ x: 450, y: 275, zoom: 4 });
      expect(panBy({ x: 600, y: 300, zoom: 4 }, 5000, 0, BASE)).toEqual({
         x: 750,
         y: 300,
         zoom: 4,
      });
   });

   it("cannot pan at all at 1x, which is why a drag has to start zoomed", () => {
      expect(panBy({ x: 0, y: 0, zoom: 1 }, 400, 400, BASE)).toEqual({ x: 0, y: 0, zoom: 1 });
   });

   it("ignores a non-finite delta instead of poisoning the view", () => {
      expect(panBy(CENTRE, NaN, Infinity, BASE)).toEqual(CENTRE);
   });
});

describe("zoomAt", () => {
   it("holds the anchor at the same point on screen", () => {
      const anchor = { x: 460, y: 320 };
      const before = relativePosition(CENTRE, anchor);
      const zoomed = zoomAt(CENTRE, ZOOM_STEP, anchor, BASE);
      const after = relativePosition(zoomed, anchor);

      expect(zoomed.zoom).toBe(8);
      expect(after.x).toBeCloseTo(before.x, 10);
      expect(after.y).toBeCloseTo(before.y, 10);
   });

   it("keeps the anchor fixed for wheel and pinch factors too", () => {
      const anchor = { x: 520, y: 340 };
      for (const factor of [1.07, 1.5, 2, Math.exp(0.31), 0.5]) {
         const before = relativePosition(CENTRE, anchor);
         const after = relativePosition(zoomAt(CENTRE, factor, anchor, BASE), anchor);
         expect(after.x).toBeCloseTo(before.x, 10);
         expect(after.y).toBeCloseTo(before.y, 10);
      }
   });

   it("zooms out as well as in", () => {
      expect(zoomAt(CENTRE, 0.5, { x: 500, y: 350 }, BASE).zoom).toBe(2);
   });

   it("refuses to pass the limits rather than inverting the map", () => {
      const centre = { x: 500, y: 378.5 };
      expect(zoomAt({ x: 0, y: 0, zoom: 1 }, 1 / ZOOM_STEP, centre, BASE).zoom).toBe(1);
      expect(zoomAt({ x: 0, y: 0, zoom: 16 }, ZOOM_STEP, centre, BASE).zoom).toBe(MAX_MAP_ZOOM);
      expect(zoomAt({ x: 0, y: 0, zoom: 32 }, ZOOM_STEP, centre, BASE).zoom).toBe(MAX_MAP_ZOOM);
   });

   it("clamps the offset when zooming at an edge", () => {
      const zoomed = zoomAt({ x: 0, y: 0, zoom: 1 }, 2, { x: 0, y: 0 }, BASE);
      expect(zoomed).toEqual({ x: 0, y: 0, zoom: 2 });
   });

   it("treats a factor of 1 as a no-op", () => {
      expect(zoomAt(CENTRE, 1, { x: 460, y: 320 }, BASE)).toEqual(CENTRE);
      expect(zoomAt(CENTRE, NaN, { x: 460, y: 320 }, BASE)).toEqual(CENTRE);
   });

   it("survives a missing anchor", () => {
      expect(zoomAt(CENTRE, 2, undefined as unknown as { x: number; y: number }, BASE).zoom).toBe(
         8,
      );
   });
});

describe("windowCentre", () => {
   it("is the middle of the visible window", () => {
      expect(windowCentre(CENTRE, BASE)).toEqual({
         x: 400 + viewSize(CENTRE, BASE).width / 2,
         y: 300 + viewSize(CENTRE, BASE).height / 2,
      });
   });

   it("centres a button-press zoom on what is already on screen", () => {
      const anchor = windowCentre(CENTRE, BASE);
      expect(relativePosition(zoomAt(CENTRE, ZOOM_STEP, anchor, BASE), anchor)).toEqual({
         x: 0.5,
         y: 0.5,
      });
   });
});

describe("viewBoxFor", () => {
   it("keeps the map's aspect ratio at every zoom level", () => {
      // This invariant is the whole reason the view is x/y/zoom rather than a
      // free 4-tuple: it stops `meet` letterboxing and keeps the drag scale a
      // single number per level.
      for (const zoom of [1, 2, 3.7, 8, 16, 32]) {
         for (const view of [
            { x: 0, y: 0, zoom },
            { x: 123.456, y: 89.1, zoom },
            { x: 9999, y: -9999, zoom },
         ]) {
            const [, , width, height] = viewBoxFor(view, BASE).split(" ").map(Number);
            expect(width / height).toBeCloseTo(BASE.width / BASE.height, 3);
         }
      }
   });

   it("matches the payload's own viewBox when untouched", () => {
      expect(viewBoxFor(initialMapView(), BASE)).toBe("0 0 1000 757");
   });

   it("rounds to two decimals", () => {
      const [, , , height] = viewBoxFor({ x: 0.004, y: 0, zoom: 3 }, BASE).split(" ").map(Number);
      expect(height).toBe(252.33);
      expect(viewBoxFor({ x: 0.004, y: 0, zoom: 3 }, BASE).startsWith("0 ")).toBe(true);
   });

   it("produces four finite numbers even from junk input", () => {
      const parts = viewBoxFor({ x: NaN, y: Infinity, zoom: NaN }, undefined).split(" ");
      expect(parts).toHaveLength(4);
      for (const part of parts) expect(Number.isFinite(Number(part))).toBe(true);
   });
});

describe("zoom controls", () => {
   it("reports the reset state", () => {
      expect(isResetView(initialMapView())).toBe(true);
      expect(isResetView({ x: 1, y: 0, zoom: 1 })).toBe(false);
      expect(isResetView({ x: 0, y: 0, zoom: 2 })).toBe(false);
   });

   it("knows when each direction is available", () => {
      expect(canZoomIn(initialMapView())).toBe(true);
      expect(canZoomOut(initialMapView())).toBe(false);
      expect(canZoomIn({ x: 0, y: 0, zoom: MAX_MAP_ZOOM })).toBe(false);
      expect(canZoomOut({ x: 0, y: 0, zoom: MAX_MAP_ZOOM })).toBe(true);
   });

   it("reaches the whole range in whole steps", () => {
      let view = initialMapView();
      const seen = [view.zoom];
      while (canZoomIn(view)) {
         view = zoomAt(view, ZOOM_STEP, windowCentre(view, BASE), BASE);
         seen.push(view.zoom);
      }
      expect(seen).toEqual([1, 2, 4, 8, 16, 32]);
   });

   it("returns to the exact starting frame after zooming in and back out", () => {
      const anchor = { x: 333, y: 222 };
      let view = initialMapView();
      for (let i = 0; i < 5; i++) view = zoomAt(view, ZOOM_STEP, anchor, BASE);
      for (let i = 0; i < 5; i++) view = zoomAt(view, 1 / ZOOM_STEP, anchor, BASE);
      expect(view).toEqual(initialMapView());
   });
});

describe("wheel zoom", () => {
   it("doubles on one mouse notch", () => {
      // Scroll up (negative delta) zooms in, scroll down zooms out.
      expect(wheelZoomFactor(-100)).toBeCloseTo(2, 10);
      expect(wheelZoomFactor(100)).toBeCloseTo(0.5, 10);
   });

   it("scrolls up to zoom in and down to zoom out", () => {
      expect(wheelZoomFactor(-120)).toBeGreaterThan(1);
      expect(wheelZoomFactor(120)).toBeLessThan(1);
   });

   it("composes many small trackpad deltas into a smooth change", () => {
      // A trackpad emits a stream of small deltas. Each must be a gentle nudge,
      // and because the curve is exponential the total must not depend on how
      // many events the browser happened to batch the gesture into.
      const perEvent = wheelZoomFactor(-4);
      expect(perEvent).toBeGreaterThan(1);
      expect(perEvent).toBeLessThan(1.05);

      let zoom = 1;
      for (let i = 0; i < 10; i++) zoom *= perEvent;
      expect(zoom).toBeCloseTo(wheelZoomFactor(-40), 10);
   });

   it("normalises line and page deltas to pixels", () => {
      expect(normalizeWheelDelta(1, 0)).toBe(1);
      expect(normalizeWheelDelta(1, 1)).toBe(16);
      expect(normalizeWheelDelta(1, 2)).toBe(100);
      expect(normalizeWheelDelta(NaN, 0)).toBe(0);
      expect(wheelZoomFactor(NaN)).toBe(1);
   });

   it("scales the rate off a real wheel notch rather than a magic number", () => {
      expect(WHEEL_ZOOM_RATE).toBeCloseTo(Math.LN2 / 100, 12);
   });
});

describe("at maximum zoom", () => {
   it("leaves a window that can hold the smallest district", () => {
      // Xankəndi is 9x12 user units. It has to fit inside the window or deep
      // zoom would still leave the smallest regions unusable.
      const smallest = { width: 9, height: 12 };
      const window = viewSize({ x: 0, y: 0, zoom: MAX_MAP_ZOOM }, BASE);
      expect(window.width).toBeGreaterThan(smallest.width);
      expect(window.height).toBeGreaterThan(smallest.height);
   });

   it("still leaves room to pan to it from anywhere", () => {
      const from = { x: 0, y: 0, zoom: MAX_MAP_ZOOM };
      const to = { x: 900, y: 700, zoom: MAX_MAP_ZOOM };
      expect(panBy(from, to.x - from.x, to.y - from.y, BASE)).toEqual(to);
   });

   it("can still be reached from a view panned at another zoom", () => {
      const zoomedIn = zoomAt(initialMapView(), ZOOM_STEP, { x: 0, y: 0 }, BASE);
      const deep = zoomAt(zoomedIn, 16, { x: 5, y: 5 }, BASE);
      expect(deep.zoom).toBe(MAX_MAP_ZOOM);
      expect(clampView(deep, BASE)).toEqual(deep);
   });
});
