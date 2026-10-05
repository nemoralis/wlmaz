/**
 * Which row actions a monument supports.
 *
 * Separated from the template so the rules are one testable function rather than
 * three `v-if`s spread across a table cell. The answer is data-dependent and
 * uneven: across the monuments matched to a region, 19% can be shown on the map
 * and 9% have a Wikipedia article, so **80% of rows carry no button at all** and
 * six regions have none on any row. That ratio is a property of the dataset, not
 * a layout fault, and it moves whenever the geojson is regenerated — so it is
 * asserted in `monumentActions.test.ts` rather than left to be rediscovered by
 * eye.
 */

import type { MonumentProps } from "@/types";

/** The three actions a monument row can offer. */
export interface MonumentRowActions {
   /** Open the upload modal. Only ever true for a session allowed to upload. */
   upload: boolean;
   /** Open the monument's Wikipedia article in a new tab. */
   wiki: boolean;
   /** Reveal the monument on the map. */
   map: boolean;
}

/**
 * Decides the actions for one row.
 *
 * `canUpload` is passed in rather than read here: `auth.canUpload` is
 * `localUploadEnabled || !!user`, so in production it is false for anonymous
 * visitors and the upload button is simply absent for them.
 *
 * The Wikipedia link is trimmed because a whitespace-only `azLink` would render
 * a button that opens a blank page. No such value exists today; this only stops
 * one appearing later.
 */
export const rowActionsFor = (row: MonumentProps, canUpload: boolean): MonumentRowActions => ({
   upload: canUpload,
   wiki: typeof row.azLink === "string" && row.azLink.trim() !== "",
   // `lat` is only populated for monuments the store could flatten a geometry
   // into, so it is exactly the "can be shown on the map" test.
   map: typeof row.lat === "number",
});
