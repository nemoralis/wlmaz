import type { MonumentProps } from "../types";

export const getOptimizedImage = (url: string): string => {
   if (!url) return "";
   // Force HTTPS
   if (url.startsWith("http:")) {
      url = url.replace("http:", "https:");
   }

   // If it's a Wikimedia Commons Special:FilePath URL, we can request a specific width
   if (url.includes("Special:FilePath/")) {
      return `${url}?width=500`;
   }
   return url;
};

export const getSrcSet = (url: string, widths: number[]): string => {
   if (!url || !url.includes("Special:FilePath/")) return "";
   const secureUrl = url.startsWith("http:") ? url.replace("http:", "https:") : url;
   return widths.map((w) => `${secureUrl}?width=${w} ${w}w`).join(", ");
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
