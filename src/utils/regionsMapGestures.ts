/**
 * Tap-versus-drag state for the regions map.
 *
 * Two things live here, and both were load-bearing:
 *
 * 1. **When the pointer may be captured.** `setPointerCapture` retargets the
 *    compatibility mouse events — including `click` — at the capturing element.
 *    Capturing on `pointerdown` therefore means the `<a>` wrapping each region
 *    never receives the click, the router's `navigate` is never called, and
 *    clicking a region silently does nothing. So capture waits until the gesture
 *    is unambiguously a drag, which is exactly what this module decides.
 *
 * 2. **Whether the trailing click belongs to a drag** and must be ignored, so a
 *    pan does not also open a region page.
 *
 * It is a plain object with no DOM access so both rules can be tested. The
 * component performs the capture itself, because only it holds the element.
 */

import { DRAG_THRESHOLD_PX } from "./regionsMapView";

/** A pointer position in client px. */
export interface GesturePoint {
   x: number;
   y: number;
}

export interface GestureTracker {
   /** Records a press. Returns the pointer ids the caller should capture now. */
   down: (pointerId: number, point: GesturePoint) => number[];
   /**
    * Records movement. Returns the pointer ids the caller should capture now.
    *
    * Reports the id on every move past the threshold: the tracker holds gesture
    * state, not DOM state, so it cannot know what is already captured. Callers
    * must guard the capture themselves (`hasPointerCapture`).
    */
   move: (pointerId: number, point: GesturePoint) => number[];
   /** Records a release. Deliberately does not clear `isDrag`. */
   up: (pointerId: number) => void;
   /** Whether the current gesture has travelled far enough to be a drag. */
   isDrag: () => boolean;
   /**
    * Clears the drag flag. Must be called on a *later* task than the release,
    * because the click that follows `pointerup` still has to see the flag.
    */
   clearDrag: () => void;
   /** Every active pointer, for pinch distance and midpoint. */
   points: () => GesturePoint[];
   /**
    * Last recorded position of one pointer, or `undefined` when it is not part
    * of a gesture. Read before `move`, which overwrites it.
    */
   at: (pointerId: number) => GesturePoint | undefined;
   /** How many pointers are down. */
   size: () => number;
   /** Drops all state, on unmount. */
   reset: () => void;
}

export const createGestureTracker = (thresholdPx = DRAG_THRESHOLD_PX): GestureTracker => {
   const pointers = new Map<number, GesturePoint>();
   let dragged = false;

   return {
      down(pointerId, point) {
         pointers.set(pointerId, point);

         // Two fingers is a pinch, never a tap, so it is safe to capture now and
         // does need to: the zoom has to survive either finger leaving the map.
         // One finger deliberately returns nothing — see the module comment.
         if (pointers.size >= 2) return [...pointers.keys()];
         return [];
      },

      move(pointerId, point) {
         const previous = pointers.get(pointerId);
         // A move for a pointer we never saw pressed (mouse hovering the map)
         // is not part of any gesture and must not pan it.
         if (!previous) return [];

         pointers.set(pointerId, point);
         const travel = Math.hypot(point.x - previous.x, point.y - previous.y);
         if (travel <= thresholdPx) return [];

         // Past the threshold this is a drag: stop waiting and capture, so the
         // pan is not cut short when the cursor crosses a region boundary.
         dragged = true;
         return [pointerId];
      },

      up(pointerId) {
         pointers.delete(pointerId);
      },

      isDrag: () => dragged,

      clearDrag: () => {
         dragged = false;
      },

      points: () => [...pointers.values()],

      at: (pointerId) => pointers.get(pointerId),

      size: () => pointers.size,

      reset: () => {
         pointers.clear();
         dragged = false;
      },
   };
};
