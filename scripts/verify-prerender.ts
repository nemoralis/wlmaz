import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = "https://wikilovesmonuments.az";
const PUBLIC_DIR = path.join(__dirname, "../public");
const DIST_DIR = path.join(__dirname, "../dist");
const GEOJSON_PATH = path.join(PUBLIC_DIR, "monuments.geojson");
const MONUMENT_DIR = path.join(DIST_DIR, "monument");
const SITEMAP_PATH = path.join(DIST_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(DIST_DIR, "robots.txt");

const SITE_TITLE = "Viki Abidələri Sevir Azərbaycan";
const SHELL_DESCRIPTION =
   "Azərbaycanın tarixi abidələri və mədəni irs xəritəsi. Bakı, Şəki, Qəbələ və digər bölgələrdəki 300+ abidəni kəşf edin. Viki Abidələri Sevir müsabiqəsinə şəkil yükləyin.";

const STATIC_PAGES = ["/", "/stats", "/leaderboard", "/table", "/about"];

interface MonumentFeature {
   type: "Feature";
   geometry: { type: "Point"; coordinates: [number, number] };
   properties: Record<string, string>;
}

const errors: string[] = [];

const fail = (message: string): void => {
   errors.push(message);
};

const encodeIdForUrl = (id: string): string => encodeURI(id).replace(/\./g, "%2E");

const safeFileName = (id: string): string => id.replace(/[^\w\u00A0-\uFFFF.-]/g, "_");

const countOf = (html: string, pattern: RegExp): number => {
   const matches = html.match(pattern);
   return matches ? matches.length : 0;
};

const attrValue = (tag: string, attr: string): string => {
   const match = tag.match(new RegExp(`${attr}="([^"]*)"`));
   return match ? match[1] : "";
};

const extractTitle = (html: string): string | null => {
   const match = html.match(/<title>([^<]*)<\/title>/);
   return match ? match[1] : null;
};

const checkMonumentHtml = (html: string, loc: string, label: string): void => {
   const title = extractTitle(html);
   if (!title) {
      fail(`${label}: missing <title>`);
   } else if (title === SITE_TITLE) {
      fail(`${label}: <title> is the default SPA shell title`);
   }

   const canonicalTags = html.match(/<link[^>]*rel="canonical"[^>]*>/g) || [];
   if (canonicalTags.length !== 1) {
      fail(`${label}: expected exactly 1 canonical link, found ${canonicalTags.length}`);
   } else if (attrValue(canonicalTags[0], "href") !== loc) {
      fail(
         `${label}: canonical href "${attrValue(canonicalTags[0], "href")}" != sitemap loc "${loc}"`,
      );
   }

   const descriptionTags = html.match(/<meta[^>]*name="description"[^>]*>/g) || [];
   if (descriptionTags.length !== 1) {
      fail(`${label}: expected exactly 1 description meta, found ${descriptionTags.length}`);
   } else {
      const content = attrValue(descriptionTags[0], "content");
      if (!content) {
         fail(`${label}: description meta is empty`);
      } else if (content === SHELL_DESCRIPTION) {
         fail(`${label}: description is the default SPA shell description`);
      }
   }

   const ogTitleCount = countOf(html, /<meta[^>]*property="og:title"[^>]*>/g);
   if (ogTitleCount !== 1) {
      fail(`${label}: expected exactly 1 og:title, found ${ogTitleCount}`);
   }

   const ogUrlTags = html.match(/<meta[^>]*property="og:url"[^>]*>/g) || [];
   if (ogUrlTags.length !== 1) {
      fail(`${label}: expected exactly 1 og:url, found ${ogUrlTags.length}`);
   } else if (attrValue(ogUrlTags[0], "content") !== loc) {
      fail(`${label}: og:url "${attrValue(ogUrlTags[0], "content")}" != sitemap loc "${loc}"`);
   }

   const jsonLdBlocks =
      html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
   if (jsonLdBlocks.length < 2) {
      fail(
         `${label}: expected >= 2 JSON-LD blocks (monument + breadcrumb), found ${jsonLdBlocks.length}`,
      );
   }
   for (const block of jsonLdBlocks) {
      const content =
         (block.match(/type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/) || [])[1] ?? "";
      try {
         const parsed = JSON.parse(content);
         if (!parsed || typeof parsed !== "object" || !parsed["@context"]) {
            fail(`${label}: JSON-LD block missing @context`);
         }
      } catch {
         fail(`${label}: JSON-LD block is not valid JSON`);
      }
   }

   if (!html.includes('id="seo-content"')) {
      fail(`${label}: missing #seo-content container`);
   }
   if (!/id="seo-content"[\s\S]*?<h1[\s>]/.test(html)) {
      fail(`${label}: #seo-content has no <h1>`);
   }
};

const checkStaticHtml = (html: string, loc: string, label: string): void => {
   const title = extractTitle(html);
   if (!title) {
      fail(`${label}: missing <title>`);
   } else if (loc !== `${HOST}/` && title === SITE_TITLE) {
      // The homepage legitimately carries the site name as its title.
      fail(`${label}: <title> is the default SPA shell title`);
   }

   const canonicalTags = html.match(/<link[^>]*rel="canonical"[^>]*>/g) || [];
   if (canonicalTags.length !== 1) {
      fail(`${label}: expected exactly 1 canonical link, found ${canonicalTags.length}`);
   } else if (attrValue(canonicalTags[0], "href") !== loc) {
      fail(
         `${label}: canonical href "${attrValue(canonicalTags[0], "href")}" != sitemap loc "${loc}"`,
      );
   }

   const descriptionTags = html.match(/<meta[^>]*name="description"[^>]*>/g) || [];
   if (descriptionTags.length !== 1) {
      fail(`${label}: expected exactly 1 description meta, found ${descriptionTags.length}`);
   } else if (!attrValue(descriptionTags[0], "content")) {
      fail(`${label}: description meta is empty`);
   }
};

const main = async (): Promise<void> => {
   try {
      const geoData = JSON.parse(await fs.readFile(GEOJSON_PATH, "utf-8"));
      const features = geoData.features as MonumentFeature[];

      const monumentLocToFile = new Map<string, string>();
      for (const feature of features) {
         const rawInventory = feature.properties.inventory || "";
         if (!rawInventory) continue;
         const canonicalId = rawInventory.split(",")[0].trim();
         const loc = `${HOST}/monument/${encodeIdForUrl(canonicalId)}`;
         monumentLocToFile.set(loc, `${safeFileName(canonicalId)}.html`);
      }

      const expectedLocs = new Set<string>([
         `${HOST}/`,
         ...STATIC_PAGES.filter((r) => r !== "/").map((r) => `${HOST}${r}`),
         ...monumentLocToFile.keys(),
      ]);

      let sitemap: string;
      let robots: string;
      try {
         sitemap = await fs.readFile(SITEMAP_PATH, "utf-8");
         robots = await fs.readFile(ROBOTS_PATH, "utf-8");
      } catch {
         fail("sitemap.xml or robots.txt is missing — run the prerender step first");
         throw new Error("abort");
      }

      // --- Sitemap vs expected URLs (catches missing, extra, and duplicate entries) ---
      const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const uniqueLocs = new Set(sitemapLocs);
      if (sitemapLocs.length !== uniqueLocs.size) {
         const dups = sitemapLocs.filter((l, i) => sitemapLocs.indexOf(l) !== i);
         fail(
            `sitemap has ${sitemapLocs.length - uniqueLocs.size} duplicate <loc> entries: ${[...new Set(dups)].join(", ")}`,
         );
      }
      const missing = [...expectedLocs].filter((loc) => !uniqueLocs.has(loc));
      const extra = [...uniqueLocs].filter((loc) => !expectedLocs.has(loc));
      if (missing.length) {
         fail(
            `sitemap is missing ${missing.length} expected URLs, e.g. ${missing.slice(0, 5).join(", ")}`,
         );
      }
      if (extra.length) {
         fail(`sitemap has ${extra.length} unexpected URLs, e.g. ${extra.slice(0, 5).join(", ")}`);
      }

      // --- URL -> file mapping for monument pages ---
      const existingFiles = new Set(await fs.readdir(MONUMENT_DIR));
      let checked = 0;
      for (const [loc, fileName] of monumentLocToFile) {
         const label = `monument ${loc.replace(`${HOST}/monument/`, "")}`;
         const filePath = path.join(MONUMENT_DIR, fileName);
         let html: string;
         try {
            html = await fs.readFile(filePath, "utf-8");
         } catch {
            fail(`${label}: file ${fileName} is missing`);
            continue;
         }
         checkMonumentHtml(html, loc, label);
         checked++;
      }

      // --- Orphaned monument files not present in the sitemap ---
      const expectedFiles = new Set(monumentLocToFile.values());
      const orphans = [...existingFiles].filter((f) => !expectedFiles.has(f));
      if (orphans.length) {
         fail(
            `dist/monument has ${orphans.length} orphan file(s) not in the sitemap: ${orphans.slice(0, 5).join(", ")}`,
         );
      }

      // --- Static pages ---
      for (const route of STATIC_PAGES) {
         const loc = `${HOST}${route}`;
         const fileName = route === "/" ? "index.html" : `${route.slice(1)}.html`;
         const label = `static ${loc}`;
         let html: string;
         try {
            html = await fs.readFile(path.join(DIST_DIR, fileName), "utf-8");
         } catch {
            fail(`${label}: file ${fileName} is missing`);
            continue;
         }
         checkStaticHtml(html, loc, label);
      }

      // --- robots.txt ---
      if (!robots.includes(`Sitemap: ${HOST}/sitemap.xml`)) {
         fail("robots.txt is missing the sitemap declaration");
      }
      if (!robots.includes("Disallow: /*?*inventory=")) {
         fail("robots.txt is missing the ?inventory= disallow rule");
      }

      if (errors.length) {
         console.error(`HTML verification FAILED with ${errors.length} issue(s):`);
         for (const error of errors) {
            console.error(`  - ${error}`);
         }
         process.exit(1);
      }

      console.log(
         `HTML verification passed: ${checked} monument pages, ${STATIC_PAGES.length} static pages, sitemap (${sitemapLocs.length} URLs), robots.txt`,
      );
   } catch (error) {
      if (error instanceof Error && error.message === "abort") {
         process.exit(1);
      }
      console.error("HTML verification failed:", error);
      process.exit(1);
   }
};

main();
