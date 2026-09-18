/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefineComponent } from "vue";

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
   profile?: any;
   blocked?: boolean;
   blockreason?: string;
}

/**
 * GeoJSON properties for a Monument.
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
   lat?: number;
   lon?: number;
   [key: string]: any;
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
   // Just a basic shim to allow the import
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
