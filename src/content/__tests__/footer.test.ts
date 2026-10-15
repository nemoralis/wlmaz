/**
 * Shape assertions for the footer strip rendered by `src/App.vue`.
 *
 * The footer is part of the app shell, so it appears on every page. These
 * tests keep the WMCS badge asset self-hosted and in step with the file on
 * disk, and keep the credits links non-empty and correctly typed.
 *
 * Nothing here passes judgement on licence attribution: the badge is reused
 * uncredited by deliberate project decision, and no test should smuggle that
 * back in later.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_META_LINKS, FOOTER_WMCS_BADGE } from "@/content/footer.ts";

/** Repo root, resolved from this file rather than process.cwd(). */
const ROOT = path.resolve(import.meta.dirname, "../../..");

const readRootFile = (name: string): string => readFileSync(path.join(ROOT, name), "utf-8");

describe("footer WMCS badge", () => {
   it("uses the self-hosted copy and declares its intrinsic size", () => {
      // Bundled rather than hotlinked, like the about-page logo: the footer is
      // on every page, so it must not depend on a third-party request.
      expect(FOOTER_WMCS_BADGE.src).toBe("/powered-by-wmcs.svg");
      expect(FOOTER_WMCS_BADGE.width).toBe(1849);
      expect(FOOTER_WMCS_BADGE.height).toBe(652);
      expect(FOOTER_WMCS_BADGE.alt.length).toBeGreaterThan(0);
   });

   it("keeps the declared size in step with the file on disk", () => {
      // A verbatim copy of Commons' Powered_by_Wikimedia_Cloud_Services.svg
      // (1849.1942 × 652.42242). The width/height reserve the footer's aspect
      // box, so a re-download with different artwork would silently drift them.
      const svg = readRootFile(path.join("public", "powered-by-wmcs.svg"));
      expect(Math.round(Number(/width="([\d.]+)"/.exec(svg)?.[1]))).toBe(FOOTER_WMCS_BADGE.width);
      expect(Math.round(Number(/height="([\d.]+)"/.exec(svg)?.[1]))).toBe(FOOTER_WMCS_BADGE.height);
   });

   it("links the Cloud VPS portal, like the XTools footer", () => {
      // The badge is a link to the hosting portal; the same target xtools' own
      // footer wraps this badge in.
      expect(FOOTER_WMCS_BADGE.href).toBe("https://wikitech.wikimedia.org/wiki/Portal:Cloud_VPS");
   });

   it("is bound from the app shell rather than hardcoded", () => {
      const app = readRootFile(path.join("src", "App.vue"));
      expect(app).toContain("FOOTER_WMCS_BADGE");
      // The badge replaced the sentence, which now survives only as alt text;
      // the shell must not print both.
      expect(app).not.toContain("Wikimedia Cloud Services-də yerləşdirilib");
   });
});

describe("footer credits links", () => {
   it("renders the copyright year from a constant, not the clock", () => {
      // ABOUT_COPYRIGHT_YEAR is a fact about the footer copy; reading the clock
      // would make the prerendered document and the Vue render disagree.
      const app = readRootFile(path.join("src", "App.vue"));
      expect(app).toContain("© {{ ABOUT_COPYRIGHT_YEAR }}");
   });

   it("gives every credits link a label and a target", () => {
      for (const link of FOOTER_META_LINKS) {
         expect(link.label.length).toBeGreaterThan(0);
         // Internal routes start with "/", external URLs with a scheme.
         expect(link.to).toMatch(/^(\/|https:\/\/)/);
      }
   });

   it("does not bring the removed legal links back", () => {
      // The footer previously carried the Privacy Statement and WMCS terms
      // links; their removal was a deliberate decision, and the shell must not
      // start rendering them again behind the tests' back.
      const app = readRootFile(path.join("src", "App.vue"));
      expect(app).not.toContain("PRIVACY_FOOTER_LINKS");
   });
});
