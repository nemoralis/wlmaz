import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { regionPath } from "@/utils/regions.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_PATH = path.join(__dirname, "../../routes/index.ts");

/**
 * The real router module cannot be imported here: it calls
 * `createWebHistory()` at module scope and the suite runs in the `node`
 * environment (vitest.config.ts). So this exercises vue-router's own decoding
 * against the same path patterns the app declares, and the declarations
 * themselves are asserted against the source file below.
 */
const router = createRouter({
   history: createMemoryHistory(),
   routes: [
      { path: "/regions", name: "Regions", component: { render: () => null } },
      { path: "/region/:name", name: "Region", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", name: "NotFound", component: { render: () => null } },
   ],
});

describe("region route decoding", () => {
   it("decodes the Azerbaijani characters regionPath encodes", () => {
      // Round-tripped through the real encoder, so a change to either side
      // breaks this rather than silently producing a dead link.
      for (const name of ["Səbail", "İsmayıllı", "Naxçıvan", "Göygöl", "Şuşa", "Kəlbəcər"]) {
         const url = regionPath(name);
         expect(router.resolve(url).name).toBe("Region");
         expect(router.resolve(url).params.name).toBe(name);
      }
   });

   it("routes /regions to the map rather than to a region named 'regions'", () => {
      expect(router.resolve("/regions").name).toBe("Regions");
      expect(router.resolve("/regions").params.name).toBeUndefined();
   });

   it("hands an unknown region to the page instead of the catch-all", () => {
      // The page resolves the name itself so it can reuse NotFound.vue; if the
      // catch-all claimed it first, the region 404 could never render.
      expect(router.resolve("/region/Atlantis").name).toBe("Region");
   });
});

describe("the app's route table", () => {
   const source = fs.readFileSync(ROUTES_PATH, "utf-8");

   it("declares both region routes", () => {
      expect(source).toContain('path: "/regions"');
      expect(source).toContain('path: "/region/:name"');
   });

   it("declares /regions before /region/:name", () => {
      // Otherwise "/regions" would match the parameterised route as a region
      // called "regions".
      expect(source.indexOf('path: "/regions"')).toBeLessThan(
         source.indexOf('path: "/region/:name"'),
      );
   });

   it("declares both region routes before the catch-all", () => {
      const catchAll = source.indexOf('path: "/:pathMatch(.*)*"');
      expect(source.indexOf('path: "/regions"')).toBeLessThan(catchAll);
      expect(source.indexOf('path: "/region/:name"')).toBeLessThan(catchAll);
   });
});
