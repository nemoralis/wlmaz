/**
 * Marker sizing for the monument map.
 *
 * Radius scales with zoom so markers stay unobtrusive in the overview
 * (zoom 7 on first load) but grow large enough to click when zoomed in.
 */

/** Minimum marker radius in pixels. */
const MIN_RADIUS = 3;

/** Maximum marker radius in pixels. */
const MAX_RADIUS = 8;

/** Radius for the marker highlight ring (base + this). */
export const HIGHLIGHT_RADIUS_OFFSET = 2;

/**
 * Returns the pixel radius for monument markers at a given zoom level, clamped
 * to [MIN_RADIUS, MAX_RADIUS].
 */
export const getMarkerRadius = (zoom: number): number =>
   Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, zoom - 1));
