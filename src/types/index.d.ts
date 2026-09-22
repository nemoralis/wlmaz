import type { DefineComponent } from "vue";
import type { Feature, Point } from "geojson";

// ========================================================
// 1. SHARED DOMAIN INTERFACES
//
// API response types live in ./api.ts.  The types below are
// domain/session types used by multiple modules but not part
// of the HTTP contract.
// ========================================================

/**
 * Full user type including OAuth tokens — used by Passport
 * serialization and Express session.  The frontend should
 * use PublicWikiUser from ./api.ts instead.
 */
export interface WikiUser {
   id: string;
   username: string;
   token: string;
   tokenSecret: string;
   profile?: Record<string, unknown>;
   blocked?: boolean;
   blockreason?: string;
}

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

/**
 * Frontend display type for a leaderboard entry.
 * reg is a Date (converted from the API's YYYYMMDDHHmmss number).
 */
export interface LeaderboardUser {
   username: string;
   count: number;
   usage: number;
   reg: Date;
   rank: number;
}

// ========================================================
// 2. MODULE DECLARATIONS (SHIMS)
// ========================================================

/**
 * Allows importing .vue files
 */
declare module "*.vue" {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const component: DefineComponent<object, object, any>;
   export default component;
}

/**
 * Allows importing files with ?raw suffix (Vite feature)
 * Example: import geojson from "./data.geojson?raw";
 */
declare module "*?raw" {
   const content: string;
   export default content;
}

/**
 * Handle missing types for passport-mediawiki-oauth
 */
declare module "leaflet-sidebar-v2" {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const content: any;
   export default content;
}

// ========================================================
// 3. GLOBAL AUGMENTATIONS
// ========================================================

/**
 * Extends Express Request object to include our WikiUser.
 * This fixes `req.user.tokenSecret` errors in your backend routes.
 */
declare global {
   namespace Express {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      interface User extends WikiUser {}
   }
}
