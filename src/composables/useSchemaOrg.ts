import type { MonumentProps } from "../types";

/**
 * Composable for generating Schema.org JSON-LD structured data
 * This helps search engines understand and display content in rich results
 */

interface SchemaOrgNode {
   "@context": string;
   "@type": string | string[];
   [key: string]: unknown;
}

/**
 * Generate Schema.org markup for a monument/landmark
 */
export function useMonumentSchema(monument: MonumentProps) {
   const schema: SchemaOrgNode = {
      "@context": "https://schema.org",
      "@type": ["TouristAttraction", "LandmarksOrHistoricalBuildings"],
      name: monument.itemLabel || "Monument",
      identifier: monument.inventory || "",
   };

   // Add description if available
   if (monument.itemDescription) {
      schema.description = monument.itemDescription;
   }

   // Add alternative name if available
   if (monument.itemAltLabel) {
      schema.alternateName = monument.itemAltLabel;
   }

   // Add geographic coordinates
   if (monument.lat && monument.lon) {
      schema.geo = {
         "@type": "GeoCoordinates",
         latitude: monument.lat,
         longitude: monument.lon,
      };

      // Also add as address for better local SEO
      schema.address = {
         "@type": "PostalAddress",
         addressCountry: "AZ",
      };
   }

   // Add image if available
   if (monument.image) {
      // Convert Wikimedia Commons URL to a direct image URL
      const imageUrl = monument.image.startsWith("http")
         ? monument.image
         : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(monument.image)}`;
      schema.image = imageUrl;
   }

   // Add same-as links to Wikidata and Wikipedia
   const sameAs: string[] = [];
   if (monument.item) {
      sameAs.push(monument.item);
   }
   if (monument.azLink) {
      sameAs.push(monument.azLink);
   }
   if (sameAs.length > 0) {
      schema.sameAs = sameAs;
   }

   // Add URL to the monument page
   if (monument.inventory) {
      schema.url = `https://wikilovesmonuments.az/monument/${monument.inventory}`;
   }

   return schema;
}

/**
 * Generate Schema.org markup for the organization (Wiki Loves Monuments Azerbaijan)
 */
export function useOrganizationSchema() {
   const schema: SchemaOrgNode = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Wiki Loves Monuments Azerbaijan",
      alternateName: "Viki Abidələri Sevir Azərbaycan",
      url: "https://wikilovesmonuments.az",
      logo: "https://wikilovesmonuments.az/wlm-az.png",
      description:
         "Azərbaycandakı abidələrin interaktiv xəritəsi. Viki Abidələri Sevir müsabiqəsi üçün fotoşəkillər yükləyin.",
      sameAs: [
         "https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2025_in_Azerbaijan",
         "https://github.com/nemoralis/wlmaz",
      ],
      foundingLocation: {
         "@type": "Country",
         name: "Azerbaijan",
      },
   };

   return schema;
}

/**
 * Generate Schema.org markup for the website
 */
export function useWebSiteSchema() {
   const schema: SchemaOrgNode = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Wiki Loves Monuments Azerbaijan",
      alternateName: "Viki Abidələri Sevir Azərbaycan",
      url: "https://wikilovesmonuments.az",
      description:
         "Azərbaycandakı abidələrin interaktiv xəritəsi. Viki Abidələri Sevir müsabiqəsi üçün fotoşəkillər yükləyin.",
      inLanguage: "az",
   };

   return schema;
}

/**
 * Generate Schema.org breadcrumb markup
 */
export function useBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
   const schema: SchemaOrgNode = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
         "@type": "ListItem",
         position: index + 1,
         name: item.name,
         item: item.url,
      })),
   };

   return schema;
}

/**
 * Helper function to convert schema object to JSON-LD script string
 */
export function schemaToJsonLd(schema: SchemaOrgNode | SchemaOrgNode[]): string {
   return JSON.stringify(schema, null, 0);
}
