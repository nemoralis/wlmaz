/**
 * Coordinate link helpers for the monument details.
 *
 * On mobile the native map app is opened via a `geo:` URI; on desktop we link
 * to Google Maps instead, since most desktop setups do not handle `geo:` well.
 */

/** True when running on a mobile/narrow viewport (matches the app's 768px convention). */
export const isMobileViewport = (): boolean =>
   typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

/** Coordinates link: native map app (geo:) on mobile, Google Maps on desktop. */
export const getCoordinatesUrl = (lat: number, lon: number, isMobile: boolean): string =>
   isMobile ? `geo:${lat},${lon}` : `https://maps.google.com/?q=${lat},${lon}`;
