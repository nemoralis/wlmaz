import type { MonumentProps } from "../types";

export const getMonumentIcon = (name: string = ""): string => {
   const n = name.toLowerCase();

   switch (true) {
      case n.includes("məscid"):
         return "fa-mosque";
      case n.includes("kilsə"):
      case n.includes("monastır"):
         return "fa-church";
      case n.includes("qala"):
      case n.includes("bürc"):
      case n.includes("qüllə"):
         return "fa-chess-rook";
      case n.includes("körpü"):
         return "fa-archway";
      case n.includes("hamam"):
         return "fa-soap";
      case n.includes("türbə"):
      case n.includes("mavzoley"):
      case n.includes("saray"):
         return "fa-place-of-worship";
      case n.includes("ev"):
      case n.includes("mülk"):
      case n.includes("bina"):
         return "fa-home";
      case n.includes("sinaqoq"):
         return "fa-synagogue";
      case n.includes("nekropol"):
         return "fa-skull";
      default:
         return "fa-landmark";
   }
};

export const getOptimizedImage = (url: string): string => {
   if (!url) return "";
   // If it's a Wikimedia Commons Special:FilePath URL, we can request a specific width
   if (url.includes("Special:FilePath/")) {
      return `${url}?width=500`;
   }
   return url;
};

export const getSrcSet = (url: string, widths: number[]): string => {
   if (!url || !url.includes("Special:FilePath/")) return "";
   return widths.map((w) => `${url}?width=${w} ${w}w`).join(", ");
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
