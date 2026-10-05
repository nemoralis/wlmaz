import { describe, expect, it } from "vitest";
import {
   clampView,
   DRAG_THRESHOLD_PX,
   initialMapView,
   panBy,
   viewSize,
   windowCentre,
   ZOOM_STEP,
   zoomAt,
   type MapBase,
   type MapView,
} from "@/utils/regionsMapView.ts";

const BASE: MapBase = { width: 1000, height: 757 };

/**
 * A drag and a tap are told apart by how far the pointer travelled, and the
 * threshold is the one piece of that rule the component cannot unit test on its
 * own. These cases pin the boundary the component relies on.
 */
describe("drag threshold", () => {
   it("is small enough that a sloppy tap still counts as a click", () => {
      expect(DRAG_THRESHOLD_PX).toBeGreaterThanOrEqual(2);
      expect(DRAG_THRESHOLD_PX).toBeLessThanOrEqual(8);
   });

   it("would let a one-pixel wobble fall under it", () => {
      const wobble = 1;
      expect(wobble).toBeLessThan(DRAG_THRESHOLD_PX);
   });
});

/**
 * The conversion the component performs on every pointer event: screen px are
 * mapped through the SVG's matrix to user units, and a delta in px becomes a
 * delta in units. This models it at a fixed, realistic scale.
 */
describe("panning as the component performs it", () => {
   /** A 1000-unit-wide map rendered 350px wide on a phone. */
   const PX_WIDTH = 350;

   /**
    * Screen px per user unit at a given view. Depends on the zoom, because the
    * visible window shrinks as the map zooms in — the component reads this off
    * the element's rect on every event for the same reason.
    */
   const unitsPerPx = (view: MapView) => viewSize(view, BASE).width / PX_WIDTH;

   const toUserX = (clientX: number, view: MapView) => clientX * unitsPerPx(view);
   const toUserY = (clientY: number, view: MapView) => clientY * unitsPerPx(view);

   const drag = (from: { x: number; y: number }, to: { x: number; y: number }): MapView => {
      // Zoomed in first, because at 1x there is nothing to pan.
      const view = zoomAt(initialMapView(), ZOOM_STEP, { x: 500, y: 378.5 }, BASE);
      const fromUser = { x: toUserX(from.x, view), y: toUserY(from.y, view) };
      const toUser = { x: toUserX(to.x, view), y: toUserY(to.y, view) };
      return panBy(view, toUser.x - fromUser.x, toUser.y - fromUser.y, BASE);
   };

   it("carries the map in the direction the pointer moved", () => {
      // Dragging right and down must move the window right and down, so the map
      // itself appears to follow the finger.
      const right = drag({ x: 100, y: 150 }, { x: 200, y: 150 });
      expect(right.x).toBeGreaterThan(0);

      const down = drag({ x: 100, y: 150 }, { x: 100, y: 220 });
      expect(down.y).toBeGreaterThan(0);
   });

   it("moves by the pointer delta, scaled into user units", () => {
      const before = zoomAt(initialMapView(), ZOOM_STEP, { x: 500, y: 378.5 }, BASE);
      const after = drag({ x: 100, y: 150 }, { x: 200, y: 200 });
      const scale = unitsPerPx(before);
      expect(after.x - before.x).toBeCloseTo(100 * scale, 6);
      expect(after.y - before.y).toBeCloseTo(50 * scale, 6);
   });

   it("carries less map per dragged pixel the further in you are", () => {
      const shift = (view: MapView) =>
         panBy(view, toUserX(200, view) - toUserX(100, view), 0, BASE).x - view.x;

      // Zoomed in, each screen pixel covers less ground, so a drag of the same
      // length travels a shorter distance across the map.
      const atTwo = zoomAt(initialMapView(), 2, { x: 500, y: 378.5 }, BASE);
      const atEight = zoomAt(initialMapView(), 8, { x: 500, y: 378.5 }, BASE);
      expect(shift(atEight)).toBeLessThan(shift(atTwo));
   });

   it("stays inside the map however far the pointer is dragged", () => {
      for (const to of [
         { x: -5000, y: -5000 },
         { x: 9000, y: 9000 },
         { x: 0, y: 0 },
      ]) {
         const view = drag({ x: 175, y: 200 }, to);
         expect(clampView(view, BASE)).toEqual(view);
         expect(view.x).toBeGreaterThanOrEqual(0);
         expect(view.y).toBeGreaterThanOrEqual(0);
      }
   });

   it("does nothing at full zoom-out, which is why a drag must zoom first", () => {
      const whole = initialMapView();
      const view = panBy(
         whole,
         toUserX(200, whole) - toUserX(100, whole),
         toUserY(200, whole) - toUserY(100, whole),
         BASE,
      );
      expect(view).toEqual(initialMapView());
   });
});

/**
 * Pinch: the factor comes from the ratio of the two fingers' separation, and the
 * anchor is the midpoint converted to user units.
 */
describe("pinching as the component performs it", () => {
   const midpointOf = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
   });

   const separation = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

   interface Finger {
      x: number;
      y: number;
   }

   const pinch = (view: MapView, from: { a: Finger; b: Finger }, to: { a: Finger; b: Finger }) => {
      const before = separation(from.a, from.b);
      const after = separation(to.a, to.b);
      const midpoint = midpointOf(to.a, to.b);
      if (before <= 0) return view;
      return zoomAt(view, after / before, midpoint, BASE);
   };

   it("zooms in when the fingers spread and out when they close", () => {
      const spread = pinch(
         initialMapView(),
         { a: { x: 150, y: 150 }, b: { x: 250, y: 150 } },
         { a: { x: 100, y: 150 }, b: { x: 300, y: 150 } },
      );
      expect(spread.zoom).toBeCloseTo(2, 6);

      // Halving the separation halves the zoom, so 4x becomes 2x.
      const squeezed = pinch(
         zoomAt(initialMapView(), 4, { x: 500, y: 378.5 }, BASE),
         { a: { x: 100, y: 150 }, b: { x: 300, y: 150 } },
         { a: { x: 150, y: 150 }, b: { x: 250, y: 150 } },
      );
      expect(squeezed.zoom).toBeCloseTo(2, 6);

      // From 1x a squeeze has nowhere to go: the whole country is the floor.
      expect(
         pinch(
            initialMapView(),
            { a: { x: 100, y: 150 }, b: { x: 300, y: 150 } },
            { a: { x: 150, y: 150 }, b: { x: 250, y: 150 } },
         ).zoom,
      ).toBe(1);
   });

   it("does not jump when a second finger is added at the same spot", () => {
      // The first pinch frame has zero separation; dividing by it would produce
      // Infinity and slam the map to its zoom limit.
      const view = initialMapView();
      const sameSpot = { a: { x: 200, y: 200 }, b: { x: 200, y: 200 } };
      expect(pinch(view, sameSpot, { a: { x: 200, y: 200 }, b: { x: 260, y: 200 } })).toEqual(view);
   });

   it("holds the midpoint steady while scaling about it", () => {
      const view = zoomAt(initialMapView(), 2, { x: 500, y: 378.5 }, BASE);
      const from = { a: { x: 150, y: 150 }, b: { x: 250, y: 200 } };
      const to = { a: { x: 120, y: 100 }, b: { x: 280, y: 250 } };
      const anchor = midpointOf(to.a, to.b);

      const before = {
         x: (anchor.x - view.x) / viewSize(view, BASE).width,
         y: (anchor.y - view.y) / viewSize(view, BASE).height,
      };
      const pinched = pinch(view, from, to);
      const size = viewSize(pinched, BASE);

      expect((anchor.x - pinched.x) / size.width).toBeCloseTo(before.x, 6);
      expect((anchor.y - pinched.y) / size.height).toBeCloseTo(before.y, 6);
   });

   it("keeps a long pinch inside the zoom limits", () => {
      let view = initialMapView();
      for (let i = 0; i < 40; i++) {
         view = pinch(
            view,
            { a: { x: 200, y: 200 }, b: { x: 220, y: 200 } },
            { a: { x: 200, y: 200 }, b: { x: 240, y: 200 } },
         );
      }
      expect(view.zoom).toBeLessThanOrEqual(32);
      expect(clampView(view, BASE)).toEqual(view);
   });
});

/**
 * Wheel zoom is anchored on the cursor, and the anchor has to come from the
 * current viewBox so the point under the cursor stays put.
 */
describe("wheel zoom as the component performs it", () => {
   const wheelZoom = (view: MapView, factor: number, cursor: { x: number; y: number }) =>
      zoomAt(view, factor, cursor, BASE);

   it("keeps the cursor over the same piece of map", () => {
      const view = zoomAt(initialMapView(), ZOOM_STEP, { x: 500, y: 378.5 }, BASE);
      const cursor = { x: 620, y: 300 };
      const size = viewSize(view, BASE);
      const before = { x: (cursor.x - view.x) / size.width, y: (cursor.y - view.y) / size.height };

      const zoomed = wheelZoom(view, Math.exp(0.25), cursor);
      const next = viewSize(zoomed, BASE);
      expect((cursor.x - zoomed.x) / next.width).toBeCloseTo(before.x, 10);
      expect((cursor.y - zoomed.y) / next.height).toBeCloseTo(before.y, 10);
   });

   it("reports no movement at a zoom limit, so the page can still scroll", () => {
      // The component compares before and after; at the cap they must match.
      const atMax = { x: 0, y: 0, zoom: 32 };
      expect(zoomAt(atMax, 4, { x: 15, y: 12 }, BASE)).toEqual(atMax);
      expect(zoomAt(initialMapView(), 0.25, { x: 500, y: 378.5 }, BASE)).toEqual(initialMapView());
   });
});

/**
 * Buttons zoom about the window centre, so what was on screen stays on screen.
 */
describe("button zoom as the component performs it", () => {
   it("keeps the centre fixed while the window shrinks around it", () => {
      const view = { x: 200, y: 150, zoom: 4 };
      const centre = windowCentre(view, BASE);
      const zoomed = zoomAt(view, ZOOM_STEP, centre, BASE);

      expect(zoomed.zoom).toBe(8);
      expect(windowCentre(zoomed, BASE).x).toBeCloseTo(centre.x, 6);
      expect(windowCentre(zoomed, BASE).y).toBeCloseTo(centre.y, 6);
   });

   it("walks the full range and back to the original frame", () => {
      let view = initialMapView();
      for (let i = 0; i < 5; i++) view = zoomAt(view, ZOOM_STEP, windowCentre(view, BASE), BASE);
      expect(view.zoom).toBe(32);
      for (let i = 0; i < 5; i++) {
         view = zoomAt(view, 1 / ZOOM_STEP, windowCentre(view, BASE), BASE);
      }
      expect(view).toEqual(initialMapView());
   });
});
