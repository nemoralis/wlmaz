import type { Feature, Point } from "geojson";

/**
 * GeoJSON properties for a Monument.
 *
 * Only explicit fields are used by the app; the index-signature escape hatch
 * has been removed so typos in property names surface at compile time.
 * Coordinates live in the GeoJSON geometry; `lat`/`lon` here are the flattened
 * display form used by monument pages (see `MonumentPage.vue` / prerender).
 */
export interface MonumentProps {
   itemLabel?: string;
   itemDescription?: string;
   itemAltLabel?: string;
   inventory?: string;
   image?: string;
   commonsCategory?: string;
   item?: string;
   azLink?: string;
   commonsLink?: string;
   parentLabel?: string;
   lastModified?: string;
   /** Flattened latitude (source of truth is geometry.coordinates). */
   lat?: number;
   /** Flattened longitude (source of truth is geometry.coordinates). */
   lon?: number;
}

/**
 * A GeoJSON Feature carrying a MonumentProps payload. Geometry is the single
 * source of truth for coordinates; `props.lat/lon` are only a display convenience.
 */
export interface MonumentFeature extends Feature<Point, MonumentProps> {
   geometry: { type: "Point"; coordinates: [number, number] };
}
