/**
 * Helpers for keeping overlapping monument markers visible and distinct.
 *
 * Markers that share (or nearly share) a location are rendered fully opaque
 * and spread around a small ring so their colors never alpha-blend and every
 * marker stays clickable. Positions are derived deterministically from the
 * marker's index within its overlap group.
 */

/** Angular spread radius in degrees (~13 m at the Caucasus latitudes). */
const SPREAD_DEGREES = 0.00012;

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
 * are distributed around it so all of them remain visible without touching.
 * The longitude offset is corrected for latitude to keep the spread uniform
 * in meters.
 */
export const getSpreadPosition = (
   lat: number,
   lng: number,
   index: number,
   groupSize: number,
): { lat: number; lng: number } => {
   if (groupSize <= 1 || index === 0) {
      return { lat, lng };
   }

   const angle = (2 * Math.PI * index) / groupSize;
   const latCorrection = Math.max(Math.cos((lat * Math.PI) / 180), 0.1);

   return {
      lat: lat + Math.sin(angle) * SPREAD_DEGREES,
      lng: lng + (Math.cos(angle) * SPREAD_DEGREES) / latCorrection,
   };
};
