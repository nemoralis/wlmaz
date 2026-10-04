import { describe, expect, it } from "vitest";
import {
   CAMPAIGN,
   formatMonumentCount,
   HOME_CANONICAL,
   HOME_DESCRIPTION,
   HOME_GAP_CTA,
   HOME_GAP_HEADING,
   HOME_GAP_NOTE,
   HOME_INTRO,
   HOME_PRIMARY_CTA,
   HOME_REGIONS_HEADING,
   HOME_REGIONS_INTRO,
   HOME_SECONDARY_CTA,
   HOME_STEPS,
   HOME_STEPS_HEADING,
   HOME_STEPS_INTRO,
   HOME_TITLE,
   isCampaignActive,
} from "@/content/home.ts";
import { SITE_HOST } from "@/utils/constants.ts";

describe("formatMonumentCount", () => {
   it("groups thousands with a space, like Azerbaijani expects", () => {
      expect(formatMonumentCount(1313)).toBe("1 313");
      expect(formatMonumentCount(1000000)).toBe("1 000 000");
   });

   it("leaves small and zero counts alone", () => {
      expect(formatMonumentCount(750)).toBe("750");
      expect(formatMonumentCount(0)).toBe("0");
   });
});

describe("isCampaignActive", () => {
   it("is active right up to the campaign end, then hides", () => {
      expect(isCampaignActive(new Date(CAMPAIGN.endsAt.getTime() - 1))).toBe(true);
      expect(isCampaignActive(CAMPAIGN.endsAt)).toBe(false);
      expect(isCampaignActive(new Date(CAMPAIGN.endsAt.getTime() + 1))).toBe(false);
   });
});

describe("how-to-participate steps", () => {
   it("has exactly three steps, each with a title and a body", () => {
      expect(HOME_STEPS).toHaveLength(3);
      for (const step of HOME_STEPS) {
         expect(step.title.length).toBeGreaterThan(0);
         expect(step.body.length).toBeGreaterThan(0);
      }
   });

   it("keeps the heading and intro as shared copy for both render paths", () => {
      // These live in the content module precisely so Home.vue and
      // scripts/prerender.ts cannot drift; both import them.
      expect(HOME_STEPS_HEADING).toBe("Üç addımda başlayın");
      expect(HOME_STEPS_INTRO.length).toBeGreaterThan(20);
   });
});

describe("landing page copy", () => {
   it("points every CTA at the routes that exist after the map move", () => {
      expect(HOME_PRIMARY_CTA.to).toBe("/map");
      expect(HOME_SECONDARY_CTA.to).toBe("/about");
   });

   it("canonicalizes the home page and titles it with the site name", () => {
      expect(HOME_CANONICAL).toBe(`${SITE_HOST}/`);
      expect(HOME_TITLE).toBe("Viki Abidələri Sevir Azərbaycan");
   });

   it("keeps the meta description free of counts that go stale", () => {
      expect(HOME_DESCRIPTION).not.toContain("300+");
      expect(HOME_DESCRIPTION).not.toMatch(/\d+\s*\+/);
      expect(HOME_DESCRIPTION.length).toBeGreaterThan(50);
   });

   it("does not reuse the Turkish campaign's stock phrasing", () => {
      // The landing page previously carried near-verbatim translations of the
      // wording on vikianitlariseviyor.toolforge.org (the Turkish Wiki Loves
      // Monuments site). These phrasings must not creep back in.
      const copy = [HOME_INTRO, HOME_STEPS_HEADING, HOME_STEPS_INTRO]
         .concat(HOME_STEPS.map((step) => `${step.title} ${step.body}`))
         .join(" ");

      for (const borrowed of [
         "dünyanın ən böyük",
         "Üç addım. Müraciət tələb olunmur",
         "Necə iştirak etməli",
      ]) {
         expect(copy).not.toContain(borrowed);
      }
   });

   it("links the 2026 campaign to its Commons page", () => {
      expect(CAMPAIGN.href).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Commons:Wiki_Loves/);
   });
});

describe("photo-gap panel", () => {
   it("leads with the deficit rather than the total", () => {
      // The panel's whole point: the number a visitor could still contribute to.
      expect(HOME_GAP_HEADING.length).toBeGreaterThan(0);
      expect(HOME_GAP_NOTE.length).toBeGreaterThan(0);
   });

   it("sends the gap CTA to the map", () => {
      expect(HOME_GAP_CTA.to).toBe("/map");
   });

   it("keeps heading and CTA as shared copy for both render paths", () => {
      // Mirrors HOME_STEPS_HEADING: Home.vue and scripts/prerender.ts both
      // import these, so the two render paths cannot disagree on wording.
      expect(HOME_GAP_HEADING).toBe("Çəkilməyən abidələr");
      expect(HOME_REGIONS_HEADING.length).toBeGreaterThan(0);
      expect(HOME_REGIONS_INTRO.length).toBeGreaterThan(20);
   });
});
