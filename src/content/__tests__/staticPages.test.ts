import { describe, expect, it } from "vitest";
import { ABOUT_DESCRIPTION, ABOUT_TITLE } from "@/content/about.ts";
import {
   ABOUT_PAGE,
   ALL_STATIC_PAGES,
   ROOT_PAGE,
   STATIC_PAGE_BY_ROUTE,
   STATIC_PAGES,
} from "@/content/staticPages.ts";
import { SITE_DESCRIPTION, SITE_HOST, SITE_TITLE } from "@/utils/constants.ts";

/**
 * The shared static-page contract feeds the prerender, the verifier, the HTML
 * validator, the Express handler and the Vue page heads. These tests pin the
 * invariants those consumers rely on.
 */
describe("static page contract", () => {
   it("lists the root first and the prerendered pages in write order", () => {
      expect(ALL_STATIC_PAGES).toEqual([ROOT_PAGE, ...STATIC_PAGES]);
      expect(STATIC_PAGES.map((page) => page.route)).toEqual([
         "/stats",
         "/leaderboard",
         "/table",
         "/about",
      ]);
   });

   it("keeps the root bound to the Vite shell and site constants", () => {
      expect(ROOT_PAGE.route).toBe("/");
      expect(ROOT_PAGE.canonical).toBe(`${SITE_HOST}/`);
      expect(ROOT_PAGE.file).toBe("index.html");
      expect(ROOT_PAGE.title).toBe(SITE_TITLE);
      expect(ROOT_PAGE.description).toBe(SITE_DESCRIPTION);
   });

   it("derives every non-root canonical URL and output file from its route", () => {
      for (const page of STATIC_PAGES) {
         expect(page.route.startsWith("/")).toBe(true);
         expect(page.route.endsWith("/")).toBe(false);
         expect(page.canonical).toBe(`${SITE_HOST}${page.route}`);
         expect(page.file).toBe(`${page.route.slice(1)}.html`);
      }
   });

   it("uses unique routes, canonicals, files and titles", () => {
      for (const key of ["route", "canonical", "file", "title"] as const) {
         const values = ALL_STATIC_PAGES.map((page) => page[key]);
         expect(new Set(values).size).toBe(values.length);
      }
   });

   it("gives every page a non-empty title and description", () => {
      for (const page of ALL_STATIC_PAGES) {
         expect(page.title.trim()).not.toBe("");
         expect(page.description.trim().length).toBeGreaterThan(20);
      }
      for (const page of STATIC_PAGES) {
         expect(page.title.endsWith(`| ${SITE_TITLE}`)).toBe(true);
      }
   });

   it("keeps /about on the copy the Vue page and runtime head use", () => {
      expect(ABOUT_PAGE.title).toBe(ABOUT_TITLE);
      expect(ABOUT_PAGE.description).toBe(ABOUT_DESCRIPTION);
   });

   it("exposes a route lookup that returns the same objects", () => {
      for (const page of ALL_STATIC_PAGES) {
         expect(STATIC_PAGE_BY_ROUTE[page.route]).toBe(page);
      }
      expect(Object.keys(STATIC_PAGE_BY_ROUTE)).toHaveLength(ALL_STATIC_PAGES.length);
   });
});
