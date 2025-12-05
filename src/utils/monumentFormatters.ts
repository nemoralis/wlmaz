import type { MonumentProps } from "../types";

export const getMonumentIcon = (name: string = ""): string => {
   const n = name.toLowerCase();
   if (n.includes("məscid")) return "fa-mosque";
   if (n.includes("kilsə") || n.includes("monastır")) return "fa-church";
   if (n.includes("qala") || n.includes("bürc") || n.includes("qüllə")) return "fa-chess-rook";
   if (n.includes("körpü")) return "fa-archway";
   if (n.includes("hamam")) return "fa-soap";
   if (n.includes("türbə") || n.includes("mavzoley") || n.includes("saray"))
      return "fa-place-of-worship";
   if (n.includes("ev") || n.includes("mülk") || n.includes("bina")) return "fa-home";
   if (n.includes("sinaqoq")) return "fa-synagogue";
   if (n.includes("nekropol")) return "fa-skull";
   return "fa-landmark";
};

export const getOptimizedImage = (url: string): string => {
   if (!url) return "";
   return url;
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
