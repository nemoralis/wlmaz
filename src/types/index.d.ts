/* eslint-disable @typescript-eslint/no-explicit-any */
import { DefineComponent } from "vue";

/// <reference types="vite-plugin-pwa/client" />

// ========================================================
// 1. SHARED DOMAIN INTERFACES
// ========================================================

/**
 * Represents a User authenticated via Wikimedia Commons.
 * Used in Passport serialization and Pinia store.
 */
export interface WikiUser {
   id: string;
   username: string;
   token: string; // OAuth Access Token
   tokenSecret: string; // OAuth Secret (Backend only ideally, but needed for types)
   profile?: any; // Raw profile data from MediaWiki
}

/**
 * Represents the GeoJSON properties for a Monument.
 * Matches the structure of your monuments.geojson file.
 */
// Add this to your existing types file

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
declare module "passport-mediawiki-oauth" {
   import { Strategy as PassportStrategy } from "passport";
   export class Strategy extends PassportStrategy {
      constructor(options: any, verify: any);
   }
}

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
