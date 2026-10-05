import { describe, expect, it } from "vitest";
import {
   ABOUT_AUTHOR,
   ABOUT_BREADCRUMB,
   ABOUT_CANONICAL,
   ABOUT_COUNTS,
   ABOUT_DATA_BODY,
   ABOUT_FEATURES,
   ABOUT_LICENSES,
   ABOUT_LICENSES_FOOTER,
   ABOUT_LOGO,
   ABOUT_LOGO_CREDIT,
   ABOUT_PRIMARY_CTA,
   ABOUT_SECONDARY_CTA,
   ABOUT_SOCIAL_IMAGE,
   ABOUT_TITLE,
   ABOUT_WLM_BODY,
} from "@/content/about.ts";
import { SITE_HOST } from "@/utils/constants.ts";

/** Every route the app registers (see src/routes/index.ts). */
const ROUTES = ["/", "/map", "/about", "/stats", "/leaderboard", "/profile", "/table"];

describe("about page head", () => {
   it("uses the same title format the prerender writes for static pages", () => {
      // scripts/prerender.ts builds `${pageTitle} | ${SITE_TITLE}`; anything else
      // means the runtime head rewrites the title after hydration.
      expect(ABOUT_TITLE).toBe(`Haqqında | Viki Abidələri Sevir Azərbaycan`);
      expect(ABOUT_TITLE.endsWith("| Viki Abidələri Sevir Azərbaycan")).toBe(true);
   });

   it("canonicalizes to the /about route", () => {
      expect(ABOUT_CANONICAL).toBe(`${SITE_HOST}/about`);
      expect(ABOUT_SOCIAL_IMAGE).toBe(`${SITE_HOST}/wlm-az.png`);
   });

   it("keeps the breadcrumb ending on the page itself", () => {
      expect(ABOUT_BREADCRUMB).toHaveLength(2);
      expect(ABOUT_BREADCRUMB[0].url).toBe(`${SITE_HOST}/`);
      expect(ABOUT_BREADCRUMB.at(-1)?.url).toBe(ABOUT_CANONICAL);
   });
});

describe("about page links", () => {
   it("points both hero CTAs at routes that exist", () => {
      expect(ABOUT_PRIMARY_CTA.to).toBe("/map");
      expect(ABOUT_SECONDARY_CTA.to).toBe("/stats");
      for (const cta of [ABOUT_PRIMARY_CTA, ABOUT_SECONDARY_CTA]) {
         expect(ROUTES).toContain(cta.to);
      }
   });

   it("sends every feature card to an existing route", () => {
      expect(ABOUT_FEATURES.length).toBeGreaterThan(0);
      for (const feature of ABOUT_FEATURES) {
         expect(ROUTES).toContain(feature.to);
      }
   });

   it("names an icon for every feature so no card renders an empty tile", () => {
      for (const feature of ABOUT_FEATURES) {
         expect(feature.icon.length).toBeGreaterThan(0);
         expect(feature.cta.length).toBeGreaterThan(0);
         expect(feature.body.length).toBeGreaterThan(20);
      }
   });

   it("keeps the credits links on the project's own hosts", () => {
      expect(ABOUT_AUTHOR.href).toMatch(/^https:\/\//);
      expect(ABOUT_AUTHOR.name.length).toBeGreaterThan(0);
   });
});

describe("hero logo", () => {
   it("uses the self-hosted copy and declares its intrinsic size", () => {
      // The file is a verbatim copy of Commons' WLM_az.svg (350 × 407, portrait
      // — unlike the horizontal wlm-az.svg wordmark the header uses), so the
      // width/height attributes must match or the box jumps on load.
      expect(ABOUT_LOGO.src).toBe("/wlm-az-logo.svg");
      expect(ABOUT_LOGO.width).toBe(350);
      expect(ABOUT_LOGO.height).toBe(407);
      expect(ABOUT_LOGO.alt.length).toBeGreaterThan(0);
   });

   it("credits the author and links the licence, as CC BY-SA 3.0 requires", () => {
      expect(ABOUT_LOGO.author).toBe("Interfase");
      expect(ABOUT_LOGO.license).toBe("CC BY-SA 3.0");
      expect(ABOUT_LOGO_CREDIT).toBe(`${ABOUT_LOGO.author}, ${ABOUT_LOGO.license}`);
      expect(ABOUT_LOGO.href).toBe("https://commons.wikimedia.org/wiki/File:WLM_az.svg");
      expect(ABOUT_LOGO.licenseHref).toMatch(/^https:\/\/creativecommons\.org\//);
      // The hero shows the logo bare — no frame, no caption — so the license
      // section is the one place the credit can live.
      expect(ABOUT_LICENSES_FOOTER).not.toContain(ABOUT_LOGO.author);
   });

   it("ships the file the hero points at", async () => {
      const { readFile } = await import("fs/promises");
      const svg = await readFile(new URL(`../../../public${ABOUT_LOGO.src}`, import.meta.url));
      expect(svg.toString()).toContain("<svg");
   });
});

describe("about page copy", () => {
   it("explains the contest in prose, not as a bare heading", () => {
      expect(ABOUT_WLM_BODY.length).toBeGreaterThanOrEqual(2);
      for (const paragraph of ABOUT_WLM_BODY) {
         expect(paragraph.length).toBeGreaterThan(40);
      }
   });

   it("claims only the map layers the app actually registers", () => {
      // useLeafletMap.ts registers OSM, Google Maps and Google Satellite only —
      // the old page's "Google Maps seçimi də var" was vague about this.
      const sources = ABOUT_DATA_BODY.join(" ");
      expect(sources).toContain("OpenStreetMap");
      expect(sources).toContain("Google Maps");
   });

   it("does not promise a refresh cadence the data chain cannot guarantee", () => {
      // Data is pulled by `npm run update-data` (scheduled outside the repo), so
      // "daily" was an unverifiable claim; the page points at /stats instead.
      const copy = ABOUT_DATA_BODY.join(" ");
      expect(copy).not.toMatch(/gündəlik|hər gün/);
   });

   it("lists the three licenses the upload form offers, default first", () => {
      // src/utils/sanitize.ts falls back to cc-by-sa-4.0 for anything unknown.
      expect(ABOUT_LICENSES.map((license) => license.label)).toEqual([
         "CC BY-SA 4.0",
         "CC BY 4.0",
         "CC0",
      ]);
      for (const license of ABOUT_LICENSES) {
         expect(license.href).toMatch(/^https:\/\/creativecommons\.org\//);
      }
   });

   it("labels every hero count tile", () => {
      // The tiles render `formatMonumentCount(value)` + these labels; an empty
      // label would leave a bare number on the page.
      for (const label of Object.values(ABOUT_COUNTS)) {
         expect(label.length).toBeGreaterThan(0);
      }
   });
});
