import type { MonumentProps } from "@/types";

const WIKIMEDIA_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/**
 * Finds the closest Wikimedia-supported thumbnail width that is greater than or equal to the target.
 */
export const getClosestWikiWidth = (target: number): number => {
   return (
      WIKIMEDIA_THUMB_WIDTHS.find((w) => w >= target) ||
      WIKIMEDIA_THUMB_WIDTHS[WIKIMEDIA_THUMB_WIDTHS.length - 1]
   );
};

/**
 * Rewrites a Wikimedia Commons image URL to request a server-resized thumbnail
 * at the closest supported width >= the target. Non-Special:FilePath URLs are
 * returned unchanged (after normalizing to HTTPS).
 */
export const getOptimizedImage = (url: string, targetWidth = 500): string => {
   if (!url) return "";
   // Force HTTPS
   if (url.startsWith("http:")) {
      url = url.replace("http:", "https:");
   }

   // If it's a Wikimedia Commons Special:FilePath URL, we can request a specific width
   if (url.includes("Special:FilePath/")) {
      const width = getClosestWikiWidth(targetWidth);
      return `${url}?width=${width}`;
   }
   return url;
};

/**
 * Builds a `srcset` string for responsive `<img>` loading from a Wikimedia
 * Commons URL, snapping the requested widths to valid thumbnail sizes. Returns
 * "" for non-Special:FilePath URLs.
 */
export const getSrcSet = (url: string, widths: number[] = [330, 500, 960, 1280]): string => {
   if (!url || !url.includes("Special:FilePath/")) return "";
   const secureUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;

   // Filter and snap to valid Wikimedia widths
   const validWidths = [...new Set(widths.map(getClosestWikiWidth))].sort((a, b) => a - b);

   return validWidths.map((w) => `${secureUrl}?width=${w} ${w}w`).join(", ");
};

/**
 * Converts a Special:FilePath thumbnail URL back into a Commons File: page link.
 * Returns "" for empty input.
 */
export const getDescriptionPage = (url: string): string => {
   if (!url) return "";
   return url.replace("Special:FilePath/", "File:");
};

/**
 * Resolves the Commons category page URL for a monument, preferring an
 * explicit commonsLink when present, else building from commonsCategory.
 */
export const getCategoryUrl = (props: MonumentProps): string => {
   if (props.commonsLink) return props.commonsLink;
   if (props.commonsCategory) {
      return `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(props.commonsCategory)}`;
   }
   return "";
};

/**
 * Returns the first ID from a comma-separated inventory string.
 */
export const getCanonicalId = (inventory: string | undefined): string => {
   if (!inventory) return "";
   return inventory.split(",")[0].trim();
};

/**
 * Returns the set of itemLabels used by more than one monument. Page titles
 * for these labels get the canonical inventory id appended so every
 * prerendered page keeps a unique <title> (see scripts/prerender.ts and
 * MonumentPage.vue). Empty labels are normalized to the "Abidə" fallback so
 * label-less monuments cannot silently collide.
 */
export const findDuplicateLabels = (labels: Iterable<string | undefined>): Set<string> => {
   const counts = new Map<string, number>();
   for (const label of labels) {
      const key = label || "Abidə";
      counts.set(key, (counts.get(key) ?? 0) + 1);
   }
   return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
};

/**
 * Builds the display label used in <title>/og:title: labels shared by several
 * monuments get the canonical inventory id appended, e.g. "Yaşayış evi (4996-12)".
 * `duplicateLabels` comes from findDuplicateLabels over the page-bearing
 * (located) monuments so prerender and runtime stay in sync.
 */
export const getDisplayLabel = (
   label: string | undefined,
   canonicalId: string,
   duplicateLabels: ReadonlySet<string>,
): string => {
   const base = label || "Abidə";
   return duplicateLabels.has(base) && canonicalId ? `${base} (${canonicalId})` : base;
};

/**
 * Encodes a monument ID for use in a URL path. Dots are kept as %2E (matching
 * the sitemap/canonical convention) and any remaining unsafe characters
 * (e.g. em-dashes) are percent-encoded.
 */
export const encodeIdForUrl = (id: string): string => encodeURI(id).replace(/\./g, "%2E");

/**
 * Builds a filesystem-safe file name from a (decoded) monument ID. Replaces
 * every character that is not a word char, a letter in any script, a dot or a
 * dash with an underscore — used by the prerender scripts for output paths.
 */
export const safeFileName = (id: string): string => id.replace(/[^\w\u00A0-\uFFFF.-]/g, "_");

/**
 * Checks if a specific ID is part of a comma-separated inventory string.
 */
export const isIdMatch = (inventory: string | undefined, searchId: string): boolean => {
   if (!inventory || !searchId) return false;
   return inventory
      .split(",")
      .map((s) => s.trim())
      .includes(searchId.trim());
};
