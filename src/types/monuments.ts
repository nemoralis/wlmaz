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
   addressLabel?: string;
   lastModified?: string;
   /** Flattened latitude (source of truth is geometry.coordinates). */
   lat?: number;
   /** Flattened longitude (source of truth is geometry.coordinates). */
   lon?: number;
}

/**
 * A GeoJSON Feature carrying a MonumentProps payload. Geometry is the single
 * source of truth for coordinates; `props.lat/lon` are only a display convenience.
 * `geometry` may be `null` for monuments without coordinates (GeoJSON spec).
 */
export interface MonumentFeature extends Feature<Point | null, MonumentProps> {
   geometry: { type: "Point"; coordinates: [number, number] } | null;
}

/**
 * Top-level GeoJSON container produced by the data pipeline (and decoded from
 * `public/monuments.pbf`). Features may carry `geometry: null`.
 */
export interface MonumentGeoData {
   type: "FeatureCollection";
   features: MonumentFeature[];
}
