import { describe, expect, it } from "vitest";
import { createGestureTracker } from "@/utils/regionsMapGestures.ts";
import { DRAG_THRESHOLD_PX } from "@/utils/regionsMapView.ts";

/**
 * These cover the rule that broke: the pointer was captured on `pointerdown`,
 * which retargets the compatibility `click` at the capturing `<svg>`, so the
 * region links never saw a click and the map stopped navigating.
 *
 * A tracker returns the pointer ids the component should capture, so "does this
 * press capture?" is answerable without a browser.
 */
describe("capture timing", () => {
   it("captures nothing on a plain press", () => {
      // The regression. Capturing here swallows every click on a region.
      const gestures = createGestureTracker();
      expect(gestures.down(1, { x: 200, y: 200 })).toEqual([]);
      expect(gestures.isDrag()).toBe(false);
   });

   it("still captures nothing after a one-pixel wobble", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 200, y: 200 });
      expect(gestures.move(1, { x: 201, y: 200 })).toEqual([]);
      expect(gestures.isDrag()).toBe(false);
   });

   it("captures once the pointer passes the drag threshold", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 200, y: 200 });
      const travel = DRAG_THRESHOLD_PX + 5;

      expect(gestures.move(1, { x: 200 + travel, y: 200 })).toEqual([1]);
      expect(gestures.isDrag()).toBe(true);
   });

   it("treats travel exactly at the threshold as a tap", () => {
      // `move` measures from the last recorded point, so each case needs its own
      // tracker: stepping one px further is a 1px step, not a longer one.
      const atThreshold = createGestureTracker();
      atThreshold.down(1, { x: 100, y: 100 });
      expect(atThreshold.move(1, { x: 100 + DRAG_THRESHOLD_PX, y: 100 })).toEqual([]);
      expect(atThreshold.isDrag()).toBe(false);

      const pastThreshold = createGestureTracker();
      pastThreshold.down(1, { x: 100, y: 100 });
      expect(pastThreshold.move(1, { x: 100 + DRAG_THRESHOLD_PX + 1, y: 100 })).toEqual([1]);
      expect(pastThreshold.isDrag()).toBe(true);
   });

   it("keeps reporting the drag on every move of a long drag", () => {
      // The tracker holds gesture state, not DOM state, so it cannot know what is
      // already captured. Repeating the instruction is harmless because the
      // component guards the call with `hasPointerCapture`.
      const gestures = createGestureTracker();
      gestures.down(1, { x: 0, y: 0 });
      expect(gestures.move(1, { x: 40, y: 0 })).toEqual([1]);
      expect(gestures.move(1, { x: 80, y: 0 })).toEqual([1]);
      expect(gestures.isDrag()).toBe(true);
   });

   it("captures both pointers as soon as a second one lands", () => {
      // A pinch is never a tap, so it captures immediately and does not have to
      // wait for a threshold.
      const gestures = createGestureTracker();
      gestures.down(1, { x: 150, y: 150 });
      expect(gestures.down(2, { x: 250, y: 150 }).sort()).toEqual([1, 2]);
   });

   it("ignores movement from a pointer it never saw pressed", () => {
      // A mouse hovering the map fires pointermove with no press behind it; that
      // must not start a pan or capture anything.
      const gestures = createGestureTracker();
      expect(gestures.move(7, { x: 300, y: 300 })).toEqual([]);
      expect(gestures.isDrag()).toBe(false);
   });
});

describe("tap versus drag", () => {
   it("reports a tap as navigable after the release", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 200, y: 200 });
      gestures.move(1, { x: 201, y: 202 });
      gestures.up(1);

      // What `onRegionClick` reads: false means navigate.
      expect(gestures.isDrag()).toBe(false);
   });

   it("keeps reporting a drag after the release, until cleared", () => {
      // The click is dispatched *after* pointerup, so `up` must not clear the
      // flag on its own — that is why the component defers to a macrotask.
      const gestures = createGestureTracker();
      gestures.down(1, { x: 0, y: 0 });
      gestures.move(1, { x: 100, y: 0 });
      gestures.up(1);

      expect(gestures.isDrag()).toBe(true);
      gestures.clearDrag();
      expect(gestures.isDrag()).toBe(false);
   });

   it("reports a drag as navigable only after it is explicitly cleared", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 0, y: 0 });
      gestures.move(1, { x: 100, y: 0 });
      expect(gestures.isDrag()).toBe(true);
      gestures.clearDrag();
      expect(gestures.isDrag()).toBe(false);
   });

   it("does not leak a drag into the next gesture", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 0, y: 0 });
      gestures.move(1, { x: 100, y: 0 });
      gestures.up(1);
      gestures.clearDrag();

      // A tap right after a pan must navigate again.
      gestures.down(2, { x: 400, y: 400 });
      gestures.up(2);
      expect(gestures.isDrag()).toBe(false);
   });

   it("honours a custom threshold", () => {
      const gestures = createGestureTracker(1);
      gestures.down(1, { x: 0, y: 0 });
      expect(gestures.move(1, { x: 2, y: 0 })).toEqual([1]);
   });
});

describe("pointer bookkeeping", () => {
   it("tracks how many pointers are down", () => {
      const gestures = createGestureTracker();
      expect(gestures.size()).toBe(0);
      gestures.down(1, { x: 0, y: 0 });
      expect(gestures.size()).toBe(1);
      gestures.down(2, { x: 50, y: 0 });
      expect(gestures.size()).toBe(2);
      gestures.up(1);
      expect(gestures.size()).toBe(1);
   });

   it("reports each pointer's last position for pinch maths", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 10, y: 20 });
      gestures.move(1, { x: 30, y: 40 });

      expect(gestures.at(1)).toEqual({ x: 30, y: 40 });
      expect(gestures.at(99)).toBeUndefined();
   });

   it("returns both points in insertion order for pinch", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 10, y: 10 });
      gestures.down(2, { x: 90, y: 10 });
      expect(gestures.points()).toEqual([
         { x: 10, y: 10 },
         { x: 90, y: 10 },
      ]);
   });

   it("drops everything on reset", () => {
      const gestures = createGestureTracker();
      gestures.down(1, { x: 0, y: 0 });
      gestures.move(1, { x: 100, y: 0 });
      gestures.reset();

      expect(gestures.size()).toBe(0);
      expect(gestures.isDrag()).toBe(false);
      expect(gestures.at(1)).toBeUndefined();
   });
});
