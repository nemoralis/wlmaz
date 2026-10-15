/**
 * Helpers for keeping overlapping monument markers visible and distinct.
 *
 * Markers that share (or nearly share) a location are rendered fully opaque
 * and spread around a small ring so their colors never alpha-blend and every
 * marker stays clickable. The ring radius is measured in *screen pixels* at
 * the current zoom and converted to degrees, so the rosette stays a visible,
 * tappable size everywhere from the country overview (zoom 7) to street
 * level — a fixed ground distance collapses to a fraction of a pixel when
 * zoomed out. Positions derive deterministically from the marker's index
 * within its overlap group; the anchor member (index 0) stays on the true
 * coordinates.
 */

/**
 * Rounds a coordinate to 4 decimals (~11 m) so exact and near-duplicate
 * positions are grouped together.
 */
export const getOverlapGroupKey = (lat: number, lng: number): string =>
   `${lat.toFixed(4)},${lng.toFixed(4)}`;

/**
 * Returns the marker position for a member of an overlap group.
 *
 * The first member (index 0) stays at the true location; subsequent members
 * are distributed around a ring and converted to degrees for the current
 * zoom via the Web Mercator projection. The ring radius grows with the
 * group size so large clusters open up instead of piling onto each other.
 */
export const getSpreadPosition = (
   lat: number,
   lng: number,
   index: number,
   groupSize: number,
   zoom: number,
   spacingPx: number,
): { lat: number; lng: number } => {
   if (groupSize <= 1 || index === 0) {
      return { lat, lng };
   }

   // Ring radius in pixels: max(spacingPx, the circumference that fits every
   // member `spacingPx` apart). Small groups hug the anchor, large ones open
   // up so neighbouring dots keep their gap.
   const ringRadiusPx = Math.max(spacingPx, (groupSize * spacingPx) / (2 * Math.PI));

   // Web Mercator: the world is 256 * 2^zoom px wide; longitude maps linearly,
   // latitude is stretched by 1 / cos(lat).
   const worldSize = 256 * 2 ** zoom;
   const cosLat = Math.cos((lat * Math.PI) / 180);
   const degPerPxLat = (360 * cosLat) / worldSize;
   const degPerPxLng = 360 / worldSize;

   const angle = (2 * Math.PI * index) / groupSize;

   return {
      lat: lat + Math.sin(angle) * ringRadiusPx * degPerPxLat,
      lng: lng + Math.cos(angle) * ringRadiusPx * degPerPxLng,
   };
};
