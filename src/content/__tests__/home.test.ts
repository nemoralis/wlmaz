import { describe, expect, it } from "vitest";
import {
   CAMPAIGN,
   formatMonumentCount,
   HOME_BOTTOM_CTA,
   HOME_CANONICAL,
   HOME_DESCRIPTION,
   HOME_PRIMARY_CTA,
   HOME_SECONDARY_CTA,
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

describe("landing page copy", () => {
   it("points every CTA at the routes that exist after the map move", () => {
      expect(HOME_PRIMARY_CTA.to).toBe("/map");
      expect(HOME_BOTTOM_CTA.to).toBe("/map");
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

   it("links the 2026 campaign to its Commons page", () => {
      expect(CAMPAIGN.href).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Commons:Wiki_Loves/);
   });
});
