import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import {
   schemaToJsonLd,
   useBreadcrumbSchema,
   useMonumentSchema,
   useOrganizationSchema,
} from "@/composables/useSchemaOrg.ts";

describe("useMonumentSchema", () => {
   const baseMonument: MonumentProps = { itemLabel: "Nizami Mausoleum" };

   it("always sets context, type, name and identifier", () => {
      const schema = useMonumentSchema(baseMonument);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toEqual(["TouristAttraction", "LandmarksOrHistoricalBuildings"]);
      expect(schema.name).toBe("Nizami Mausoleum");
      expect(schema.identifier).toBe("");
   });

   it("falls back name to 'Monument' when itemLabel is absent", () => {
      expect(useMonumentSchema({}).name).toBe("Monument");
   });

   it("adds @id and url based on inventory", () => {
      const schema = useMonumentSchema({ ...baseMonument, inventory: "AZ-0001" });
      expect(schema["@id"]).toBe("https://wikilovesmonuments.az/monument/AZ-0001");
      expect(schema.url).toBe("https://wikilovesmonuments.az/monument/AZ-0001");
   });

   it("adds description and alternateName when present", () => {
      const schema = useMonumentSchema({
         ...baseMonument,
         itemDescription: "12th-century poet's tomb",
         itemAltLabel: "Gəncə məqbərəsi",
      });
      expect(schema.description).toBe("12th-century poet's tomb");
      expect(schema.alternateName).toBe("Gəncə məqbərəsi");
   });

   it("adds geo coordinates and address country only when lat/lon present", () => {
      expect(useMonumentSchema(baseMonument).geo).toBeUndefined();

      const schema = useMonumentSchema({
         ...baseMonument,
         lat: 40.1431,
         lon: 47.5769,
         parentLabel: "Ganja",
      });
      expect(schema.geo).toEqual({
         "@type": "GeoCoordinates",
         latitude: 40.1431,
         longitude: 47.5769,
      });
      expect(schema.address).toEqual({
         "@type": "PostalAddress",
         addressCountry: "AZ",
         addressRegion: "Ganja",
      });
   });

   it("resolves relative image names to Special:FilePath URLs", () => {
      const schema = useMonumentSchema({ ...baseMonument, image: "File:Nizami.jpg" });
      expect(schema.image).toBe(
         "https://commons.wikimedia.org/wiki/Special:FilePath/File%3ANizami.jpg",
      );
   });

   it("keeps absolute image URLs untouched", () => {
      const absolute =
         "https://commons.wikimedia.org/wiki/Special:FilePath/Nizami%20Mausoleum.jpg";
      const schema = useMonumentSchema({ ...baseMonument, image: absolute });
      expect(schema.image).toBe(absolute);
   });

   it("collects sameAs from item and azLink", () => {
      const schema = useMonumentSchema({
         ...baseMonument,
         item: "https://www.wikidata.org/wiki/Q123",
         azLink: "https://az.wikipedia.org/wiki/Gəncə",
      });
      expect(schema.sameAs).toEqual([
         "https://www.wikidata.org/wiki/Q123",
         "https://az.wikipedia.org/wiki/Gəncə",
      ]);
   });

   it("omits sameAs when no external links are present", () => {
      expect(useMonumentSchema(baseMonument).sameAs).toBeUndefined();
   });

   it("adds dateModified when lastModified is present", () => {
      const schema = useMonumentSchema({ ...baseMonument, lastModified: "2026-01-01" });
      expect(schema.dateModified).toBe("2026-01-01");
   });
});

describe("useOrganizationSchema", () => {
   it("emits a stable Organization node", () => {
      const schema = useOrganizationSchema();
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe("Wiki Loves Monuments Azerbaijan");
      expect(schema.sameAs).toHaveLength(2);
      expect(schema.foundingLocation).toEqual({ "@type": "Country", name: "Azerbaijan" });
   });
});

describe("useBreadcrumbSchema", () => {
   it("produces a BreadcrumbList with 1-based positions", () => {
      const schema = useBreadcrumbSchema([
         { name: "Home", url: "https://wikilovesmonuments.az/" },
         { name: "Monuments", url: "https://wikilovesmonuments.az/table" },
      ]);
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toEqual([
         {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://wikilovesmonuments.az/",
         },
         {
            "@type": "ListItem",
            position: 2,
            name: "Monuments",
            item: "https://wikilovesmonuments.az/table",
         },
      ]);
   });
});

describe("schemaToJsonLd", () => {
   it("stringifies an array of schema nodes", () => {
      const json = schemaToJsonLd([useOrganizationSchema(), useMonumentSchema({})]);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
   });
});