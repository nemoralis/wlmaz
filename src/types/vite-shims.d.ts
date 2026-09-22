import type { DefineComponent } from "vue";

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
