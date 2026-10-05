/**
 * Drift guard for the project's own licence statement.
 *
 * `LICENSE` is GPL-3.0 and the client bundle includes `@wikimedia/codex`, which
 * is GPL-2.0-or-later. The prose in README.md and the About page's licence
 * footer both used to claim MIT, which contradicted LICENSE and was an
 * incompatible licence for the bundled GPL-2.0+ dependency.
 *
 * Nothing in the app itself reads LICENSE, so without these assertions the two
 * prose copies could drift apart again without any test noticing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_LICENSES_FOOTER } from "@/content/about.ts";

/** Repo root, resolved from this file rather than process.cwd(). */
const ROOT = path.resolve(import.meta.dirname, "../../..");

const readRootFile = (name: string): string => readFileSync(path.join(ROOT, name), "utf-8");

describe("LICENSE", () => {
   it("is the GNU General Public License version 3", () => {
      const license = readRootFile("LICENSE");
      expect(license).toContain("GNU GENERAL PUBLIC LICENSE");
      expect(license).toContain("Version 3");
      // GPL v3 only; the v2 line would also match the substring above.
      expect(license).not.toContain("Version 2");
   });

   it("is a full licence text, not a stub", () => {
      // The real GPL-3.0 text runs ~35 KB and ends with the standard
      // "How to Apply These Terms" boilerplate.
      expect(readRootFile("LICENSE").length).toBeGreaterThan(30_000);
   });
});

describe("prose licence statements", () => {
   it("README names GPL-3.0 and no longer claims MIT", () => {
      const readme = readRootFile("README.md");
      expect(readme).toContain("GNU General Public License v3.0");
      expect(readme).not.toMatch(/\bMIT License\b/);
   });

   it("the About licence footer names GPL and no longer claims MIT", () => {
      expect(ABOUT_LICENSES_FOOTER).toContain("GNU GPL v3");
      expect(ABOUT_LICENSES_FOOTER).not.toMatch(/\bMIT\b/);
   });

   it("keeps the Wikidata CC0 claim alongside the code licence", () => {
      // The footer covers two different things; dropping the data claim while
      // fixing the code claim would be its own regression.
      expect(ABOUT_LICENSES_FOOTER).toContain("CC0");
   });
});
