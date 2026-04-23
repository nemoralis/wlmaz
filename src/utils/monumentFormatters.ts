import type { MonumentProps } from "../types";

const WIKIMEDIA_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/**
 * Finds the closest Wikimedia-supported thumbnail width that is greater than or equal to the target.
 */
export const getClosestWikiWidth = (target: number): number => {
   return WIKIMEDIA_THUMB_WIDTHS.find((w) => w >= target) || WIKIMEDIA_THUMB_WIDTHS[WIKIMEDIA_THUMB_WIDTHS.length - 1];
};

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

export const getSrcSet = (url: string, widths: number[] = [330, 500, 960, 1280]): string => {
   if (!url || !url.includes("Special:FilePath/")) return "";
   const secureUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;
   
   // Filter and snap to valid Wikimedia widths
   const validWidths = [...new Set(widths.map(getClosestWikiWidth))].sort((a, b) => a - b);
   
   return validWidths.map((w) => `${secureUrl}?width=${w} ${w}w`).join(", ");
};

export const getDescriptionPage = (url: string): string => {
   if (!url) return "";
   return url.replace("Special:FilePath/", "File:");
};

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
 * Checks if a specific ID is part of a comma-separated inventory string.
 */
export const isIdMatch = (inventory: string | undefined, searchId: string): boolean => {
   if (!inventory || !searchId) return false;
   return inventory
      .split(",")
      .map((s) => s.trim())
      .includes(searchId.trim());
};
