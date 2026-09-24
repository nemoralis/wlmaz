import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";
import {
   schemaToJsonLd,
   useBreadcrumbSchema,
   useMonumentSchema,
} from "../src/composables/useSchemaOrg";
import type { MonumentProps } from "../src/types";
import { SITE_HOST } from "../src/utils/constants";
import {
   encodeIdForUrl,
   findDuplicateLabels,
   getCategoryUrl,
   getDisplayLabel,
   getOptimizedImage,
   getSrcSet,
   safeFileName,
} from "../src/utils/monumentFormatters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = SITE_HOST;
const DIST_DIR = path.join(__dirname, "../dist");
const GEOJSON_PATH = path.join(__dirname, "../data/monuments.geojson");
const MONUMENT_DIR = path.join(DIST_DIR, "monument");
// Generated nginx include with exact-match 301s for non-canonical
// comma-separated inventory parts. Lives at the repo root (outside the
// web root) — gitignored; see nginx.conf's include directive.
const REDIRECTS_PATH = path.join(__dirname, "..", "monument-redirects.conf");

const SITE_TITLE = "Viki Abidələri Sevir Azərbaycan";

const escapeXml = (value: string): string =>
   value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

const escapeHtml = (value: string): string =>
   value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface MonumentFeature {
   type: "Feature";
   geometry: { type: "Point"; coordinates: [number, number] } | null;
   properties: Record<string, string>;
}

interface SitemapEntry {
   loc: string;
   lastmod: string;
}

const readGeoJson = async (): Promise<MonumentFeature[]> => {
   const content = await fs.readFile(GEOJSON_PATH, "utf-8");
   const data = JSON.parse(content);
   return data.features as MonumentFeature[];
};

const buildMonumentProps = (feature: MonumentFeature, canonicalId: string): MonumentProps => {
   const props: MonumentProps = {
      ...feature.properties,
      inventory: canonicalId,
   };
   if (feature.geometry) {
      const [lon, lat] = feature.geometry.coordinates;
      props.lat = lat;
      props.lon = lon;
   }
   return props;
};

const renderContent = (props: MonumentProps): string => {
   const label = escapeHtml(props.itemLabel || "Abidə");
   const altLabel = props.itemAltLabel ? escapeHtml(props.itemAltLabel) : "";
   const description = props.itemDescription ? escapeHtml(props.itemDescription) : "";
   const inventory = escapeHtml(props.inventory || "");
   const parentLabel = props.parentLabel ? escapeHtml(props.parentLabel) : "";
   const imageUrl = props.image ? getOptimizedImage(props.image, 768) : "";
   const srcSet = props.image ? getSrcSet(props.image, [500, 768, 1024, 1536]) : "";
   const categoryUrl = getCategoryUrl(props);

   // Breadcrumb: Ana Səhifə > [District] > Name
   const breadcrumbItems: string[] = [
      `<a href="/" style="color:#2563eb;text-decoration:none;">Ana Səhifə</a>`,
   ];
   if (parentLabel) {
      breadcrumbItems.push(`<span style="color:#9ca3af;">${parentLabel}</span>`);
   }
   breadcrumbItems.push(`<span style="color:#374151;">${label}</span>`);
   const breadcrumb = breadcrumbItems.join(
      ' <span style="color:#d1d5db;margin:0 0.25rem;">›</span> ',
   );

   // Hero image or placeholder
   let imageBlock = "";
   if (imageUrl) {
      const srcSetAttr = srcSet ? ` srcset="${escapeHtml(srcSet)}"` : "";
      imageBlock = `<img src="${escapeHtml(imageUrl)}"${srcSetAttr} alt="${label}" width="768" sizes="(max-width: 768px) 100vw, 768px" style="max-width:100%;height:auto;border-radius:8px;">`;
   } else {
      imageBlock = `<div style="display:flex;align-items:center;justify-content:center;height:200px;background:#f3f4f6;border-radius:8px;color:#9ca3af;">Şəkil yoxdur</div>`;
   }

   // Key facts grid (2×2)
   const factItems: string[] = [];
   if (parentLabel) {
      factItems.push(
         `<div style="padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;"><div style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">Rayon/Bölgə</div><div style="font-weight:600;color:#111827;">${parentLabel}</div></div>`,
      );
   }
   if (typeof props.lat === "number" && typeof props.lon === "number") {
      factItems.push(
         `<div style="padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;"><div style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">Koordinatlar</div><div style="font-weight:600;color:#111827;">${props.lat.toFixed(4)}, ${props.lon.toFixed(4)}</div></div>`,
      );
   }
   if (inventory) {
      factItems.push(
         `<div style="padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;"><div style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">İnventar nömrəsi</div><div style="font-weight:600;color:#111827;">#${inventory}</div></div>`,
      );
   }
   if (props.item) {
      const qid = escapeHtml(props.item.split("/").pop() || "");
      factItems.push(
         `<div style="padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa;"><div style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">Wikidata</div><div style="font-weight:600;color:#111827;"><a href="${escapeHtml(props.item)}" style="color:#2563eb;text-decoration:none;">${qid}</a></div></div>`,
      );
   }

   const factsBlock =
      factItems.length > 0
         ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;margin:1.5rem 0;">${factItems.join("")}</div>`
         : "";

   // External links
   const externalLinks: string[] = [];
   if (props.item) {
      externalLinks.push(
         `<a href="${escapeHtml(props.item)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.375rem;color:#2563eb;text-decoration:none;font-size:0.875rem;">Wikidata</a>`,
      );
   }
   if (props.azLink) {
      externalLinks.push(
         `<a href="${escapeHtml(props.azLink)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.375rem;color:#2563eb;text-decoration:none;font-size:0.875rem;">Vikipediya</a>`,
      );
   }
   if (categoryUrl) {
      externalLinks.push(
         `<a href="${escapeHtml(categoryUrl)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.375rem;color:#2563eb;text-decoration:none;font-size:0.875rem;">Vikianbar</a>`,
      );
   }

   const linksBlock =
      externalLinks.length > 0
         ? `<div style="display:flex;flex-wrap:wrap;gap:1rem;margin:1.5rem 0;">${externalLinks.join("")}</div>`
         : "";

   // Map placeholder
   const mapBlock =
      typeof props.lat === "number" && typeof props.lon === "number"
         ? `<div style="border:1px solid #e5e7eb;border-radius:8px;background:#f3f4f6;padding:2rem;text-align:center;margin:1.5rem 0;"><a href="/?inventory=${inventory}" style="color:#2563eb;text-decoration:none;font-weight:500;">Xəritədə baxın</a></div>`
         : "";

   return `
      <div id="seo-content" style="min-height:100vh;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
         <article style="max-width:48rem;margin:0 auto;padding:2rem 1rem;">
            <nav style="margin-bottom:1.5rem;font-size:0.875rem;">
               ${breadcrumb}
            </nav>
            <h1 style="font-size:1.875rem;font-weight:700;margin:0 0 0.5rem;">${label}</h1>
            ${altLabel ? `<p style="color:#6b7280;font-style:italic;margin:0 0 0.75rem;">${altLabel}</p>` : ""}
            ${description ? `<p style="line-height:1.6;margin:0 0 1.5rem;color:#374151;">${description}</p>` : ""}
            <div style="margin:1.5rem 0;">${imageBlock}</div>
            ${factsBlock}
            ${linksBlock}
            ${mapBlock}
         </article>
      </div>
   `;
};

/**
 * Serializes the monument's props into a JSON data block so the runtime can
 * render the page without downloading and parsing the full geojson through the
 * Web Worker. `<` is escaped to keep the JSON from closing the script tag.
 */
const buildEmbeddedData = (props: MonumentProps): string => {
   const json = JSON.stringify(props).replace(/</g, "\\u003c");
   return `<script type="application/json" id="monument-data">${json}</script>`;
};

const buildHeadTags = (
   props: MonumentProps,
   canonicalUrl: string,
   displayLabel: string,
): string => {
   const description =
      props.itemDescription || "Azərbaycanın tarixi abidələri və mədəni irs xəritəsi";
   const ogImage = props.image ? getOptimizedImage(props.image, 1280) : `${HOST}/wlm-az.png`;
   const imagePreload = props.image
      ? `<link rel="preload" as="image" href="${escapeHtml(getOptimizedImage(props.image, 768))}">`
      : "";

   const monumentSchema = useMonumentSchema(props);
   monumentSchema.url = canonicalUrl;
   if (monumentSchema.image && typeof monumentSchema.image === "string") {
      monumentSchema.image = getOptimizedImage(monumentSchema.image);
   }

   // Build breadcrumb with district level when parentLabel is available
   const breadcrumbItems = [{ name: "Ana Səhifə", url: `${HOST}/` }];
   if (props.parentLabel) {
      breadcrumbItems.push({ name: props.parentLabel, url: `${HOST}/` });
   }
   breadcrumbItems.push({ name: props.itemLabel || "Abidə", url: canonicalUrl });
   const breadcrumbSchema = useBreadcrumbSchema(breadcrumbItems);

   return `
      <meta name="description" content="${escapeHtml(description)}">
      <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
      <meta property="og:type" content="place">
      <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
      <meta property="og:site_name" content="Wiki Loves Monuments Azerbaijan">
      <meta property="og:title" content="${escapeHtml(displayLabel)}">
      <meta property="og:description" content="${escapeHtml(description)}">
      <meta property="og:image" content="${escapeHtml(ogImage)}">
      <meta property="og:locale" content="az_AZ">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${escapeHtml(displayLabel)}">
      <meta name="twitter:description" content="${escapeHtml(description)}">
      <meta name="twitter:image" content="${escapeHtml(ogImage)}">
      ${imagePreload}
      <script type="application/ld+json">${schemaToJsonLd(monumentSchema)}</script>
      <script type="application/ld+json">${schemaToJsonLd(breadcrumbSchema)}</script>`;
};

/**
 * Rewrites the built SPA shell so crawlers receive unique, real content.
 */
const buildMonumentHtml = (
   indexHtml: string,
   props: MonumentProps,
   canonicalUrl: string,
   duplicateLabels: ReadonlySet<string>,
): string => {
   // Shared labels get the canonical inventory id appended so no two pages
   // ship the same <title> ("Yaşayış evi (4996-12) | Viki Abidələri...").
   const displayLabel = getDisplayLabel(props.itemLabel, props.inventory || "", duplicateLabels);
   props.displayLabel = displayLabel;
   const title = `${displayLabel} | ${SITE_TITLE}`;
   let html = indexHtml;

   // Replace the default title.
   html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

   // Drop the homepage description/canonical/OG/Twitter tags so they don't conflict.
   html = html.replace(/<meta[^>]*name="description"[^>]*>/g, "");
   html = html.replace(/<link[^>]*rel="canonical"[^>]*>/g, "");
   html = html.replace(/<meta[^>]*property="og:[^>]*>/g, "");
   html = html.replace(/<meta[^>]*name="twitter:[^>]*>/g, "");

   // Insert per-page head tags before </head>.
   const headTags = buildHeadTags(props, canonicalUrl, displayLabel);
   // Embed the monument's props for instant runtime rendering (no geojson).
   const embeddedData = buildEmbeddedData(props);
   // Override the shell's overflow:hidden so static content is scrollable.
   const styleOverride = "<style>html, body { overflow: auto !important; height: auto; }</style>";
   html = html.replace(
      "</head>",
      `${headTags}\n   ${embeddedData}\n   ${styleOverride}\n   </head>`,
   );

   // Replace the loading skeleton inside #app with real content. The #app
   // container is the only div in the body, so its closing tag is the last
   // </div> before </body>.
   const appStart = html.indexOf('<div id="app">');
   const bodyClose = html.indexOf("</body>");
   if (appStart === -1 || bodyClose === -1) {
      throw new Error("Could not locate #app container in index.html");
   }
   const appContentEnd = html.lastIndexOf("</div>", bodyClose);
   if (appContentEnd === -1) {
      throw new Error("Could not locate #app closing tag in index.html");
   }

   const contentStart = appStart + '<div id="app">'.length;
   html = `${html.slice(0, contentStart)}${renderContent(props)}\n   ${html.slice(appContentEnd)}`;

   return html;
};

const buildStaticHtml = (
   indexHtml: string,
   route: string,
   pageTitle: string,
   description: string,
): string => {
   const title = `${pageTitle} | ${SITE_TITLE}`;
   const pageUrl = `${HOST}${route}`;
   let html = indexHtml;
   html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
   html = html.replace(/<meta[^>]*name="description"[^>]*>/g, "");
   html = html.replace(/<link[^>]*rel="canonical"[^>]*>/g, "");
   html = html.replace(/<meta[^>]*property="og:[^>]*>/g, "");
   html = html.replace(/<meta[^>]*name="twitter:[^>]*>/g, "");
   html = html.replace(
      "</head>",
      `\n      <meta name="description" content="${escapeHtml(description)}">
      <link rel="canonical" href="${escapeHtml(pageUrl)}">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${escapeHtml(pageUrl)}">
      <meta property="og:site_name" content="Wiki Loves Monuments Azerbaijan">
      <meta property="og:title" content="${escapeHtml(title)}">
      <meta property="og:description" content="${escapeHtml(description)}">
      <meta property="og:image" content="${HOST}/wlm-az.png">
      <meta property="og:locale" content="az_AZ">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${escapeHtml(title)}">
      <meta name="twitter:description" content="${escapeHtml(description)}">
      <meta name="twitter:image" content="${HOST}/wlm-az.png">
   </head>`,
   );
   return html;
};

const renderSitemap = (entries: SitemapEntry[]): string => {
   const urls = entries
      .map(
         (entry) =>
            `<url><loc>${escapeXml(entry.loc)}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod><changefreq>daily</changefreq></url>`,
      )
      .join("");
   return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};

const ROBOTS_TXT = `User-agent: *
Allow: /
User-agent: *
Disallow: /*?*inventory=

Sitemap: ${HOST}/sitemap.xml`;

const STATIC_PAGES = [
   {
      route: "/stats",
      title: "Statistika",
      description:
         "Viki Abidələri Sevir Azərbaycan müsabiqəsi statistikası: iştirakçılar, şəkil sayı və istifadə.",
   },
   {
      route: "/leaderboard",
      title: "Reytinq",
      description: "Viki Abidələri Sevir Azərbaycan müsabiqəsinin iştirakçı reytinqi.",
   },
   {
      route: "/table",
      title: "Abidələrin siyahısı",
      description: "Azərbaycan abidələrinin tam siyahısı: axtarın, çeşidləyin və şəkil yükləyin.",
   },
   {
      route: "/about",
      title: "Haqqında",
      description: "Viki Abidələri Sevir Azərbaycan layihəsi haqqında məlumat.",
   },
];

const minifyHtml = (html: string): Promise<string> =>
   minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
   });

/**
 * Builds the nginx include that 301s every non-first comma-separated
 * inventory part to its canonical page (e.g. /monument/4655 → /monument/302).
 * Only page-bearing (located, inventoried) features contribute: their
 * canonical id has a real page to land on. A part that already has its own
 * page is skipped so a live URL is never hijacked away from its own page.
 */
const buildRedirectConf = (pageFeatures: MonumentFeature[]): string => {
   const canonicalIds = new Set(
      pageFeatures.map((feature) => (feature.properties.inventory || "").split(",")[0].trim()),
   );
   const redirectByPart = new Map<string, string>();
   for (const feature of pageFeatures) {
      const parts = (feature.properties.inventory || "").split(",").map((part) => part.trim());
      const canonicalId = parts[0];
      for (const part of parts.slice(1)) {
         if (!part || part === canonicalId || canonicalIds.has(part)) continue;
         const existing = redirectByPart.get(part);
         if (existing && existing !== canonicalId) {
            throw new Error(
               `inventory part "${part}" maps to both "${existing}" and "${canonicalId}" — ambiguous redirect`,
            );
         }
         redirectByPart.set(part, canonicalId);
      }
   }

   // Values land verbatim in the nginx config: reject anything the config
   // parser treats as syntax (whitespace, quotes, ";{}", or "$" which would
   // trigger variable interpolation in the return URI).
   const unsafe = /[\s;"'\\{}$]/;
   const lines = [...redirectByPart]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([part, canonicalId]) => {
         // Key is the decoded form (nginx matches locations against the
         // percent-decoded URI); target follows the encoded sitemap convention.
         const target = encodeIdForUrl(canonicalId);
         if (unsafe.test(part) || unsafe.test(target)) {
            throw new Error(
               `inventory part "${part}" / target "${target}" is not nginx-config-safe`,
            );
         }
         return `location = /monument/${part} { return 301 /monument/${target}; }`;
      });

   return [
      "# Generated by scripts/prerender.ts — do not edit (regenerated by npm run build).",
      "# Exact-match 301s: non-first comma-separated inventory parts → canonical page.",
      ...lines,
      "",
   ].join("\n");
};

const main = async () => {
   try {
      const features = await readGeoJson();
      const indexHtml = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
      const now = new Date().toISOString();
      const sitemapEntries: SitemapEntry[] = [
         { loc: `${HOST}/`, lastmod: now },
         ...STATIC_PAGES.map(({ route }) => ({ loc: `${HOST}${route}`, lastmod: now })),
      ];

      // Only monuments with coordinates get a static page: they're the ones the
      // map/sitemap surface, and coord-less (or stale) IDs 404 at the nginx
      // layer instead of falling back to the SPA shell — the shell's homepage
      // canonical is what GSC flagged as "Google chose different canonical".
      // This keeps the static output (and its validation) proportional to the
      // located monument set.
      const locatedFeatures = features.filter((feature) => feature.geometry);

      // The page-bearing set: located features that actually get a page (the
      // loop below skips empty inventories). Drives both the redirect map and
      // duplicate-label detection so titles match what ships to crawlers.
      const pageFeatures = locatedFeatures.filter((feature) =>
         (feature.properties.inventory || "").trim(),
      );
      // Labels shared by several page-bearing monuments get the inventory id
      // appended in <title>/og:title ("Yaşayış evi (4996-12)") so no two
      // prerendered pages collide in the SERPs.
      const duplicateLabels = findDuplicateLabels(
         pageFeatures.map((feature) => feature.properties.itemLabel),
      );

      // Remove pages from previous runs so removed monuments (and the
      // coord-less set that no longer gets a page) don't leave orphans behind.
      await fs.rm(MONUMENT_DIR, { recursive: true, force: true });
      await fs.mkdir(MONUMENT_DIR, { recursive: true });

      const BATCH_SIZE = 8;
      let written = 0;
      for (let i = 0; i < locatedFeatures.length; i += BATCH_SIZE) {
         const batch = locatedFeatures.slice(i, i + BATCH_SIZE);
         await Promise.all(
            batch.map(async (feature) => {
               const rawInventory = feature.properties.inventory || "";
               if (!rawInventory) return;

               const canonicalId = rawInventory.split(",")[0].trim();
               const canonicalUrl = `${HOST}/monument/${encodeIdForUrl(canonicalId)}`;
               const props = buildMonumentProps(feature, canonicalId);

               const html = buildMonumentHtml(indexHtml, props, canonicalUrl, duplicateLabels);
               const filePath = path.join(MONUMENT_DIR, `${safeFileName(canonicalId)}.html`);
               await fs.writeFile(filePath, await minifyHtml(html));

               sitemapEntries.push({
                  loc: canonicalUrl,
                  lastmod: feature.properties.lastModified
                     ? new Date(feature.properties.lastModified).toISOString()
                     : now,
               });
            }),
         );
         written += batch.filter((f) => f.properties.inventory).length;
      }

      for (const page of STATIC_PAGES) {
         const html = buildStaticHtml(indexHtml, page.route, page.title, page.description);
         await fs.writeFile(
            path.join(DIST_DIR, `${page.route.slice(1)}.html`),
            await minifyHtml(html),
         );
      }

      await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), renderSitemap(sitemapEntries));
      await fs.writeFile(path.join(DIST_DIR, "robots.txt"), ROBOTS_TXT);

      const redirectConf = buildRedirectConf(pageFeatures);
      await fs.writeFile(REDIRECTS_PATH, redirectConf);
      const redirectCount = redirectConf
         .split("\n")
         .filter((line) => line.startsWith("location")).length;

      console.log(`Prerendered ${written} monument pages`);
      console.log(
         `Wrote ${STATIC_PAGES.length} static pages, sitemap.xml (${sitemapEntries.length} URLs), robots.txt`,
      );
      console.log(`Wrote ${redirectCount} nginx redirects to monument-redirects.conf`);
   } catch (error) {
      console.error("Prerender failed:", error);
      process.exit(1);
   }
};

main();
