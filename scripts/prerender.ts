import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
   schemaToJsonLd,
   useBreadcrumbSchema,
   useMonumentSchema,
} from "../src/composables/useSchemaOrg";
import type { MonumentProps } from "../src/types";
import { getCategoryUrl, getOptimizedImage, getSrcSet } from "../src/utils/monumentFormatters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = "https://wikilovesmonuments.az";
const PUBLIC_DIR = path.join(__dirname, "../public");
const DIST_DIR = path.join(__dirname, "../dist");
const GEOJSON_PATH = path.join(PUBLIC_DIR, "monuments.geojson");
const MONUMENT_DIR = path.join(DIST_DIR, "monument");

const SITE_TITLE = "Viki Abidələri Sevir Azərbaycan";

/**
 * Encodes a monument ID for use in a URL path. Dots are kept as %2E (matching
 * the existing canonical/sitemap convention) and any remaining unsafe
 * characters (e.g. em-dashes) are percent-encoded.
 */
const encodeIdForUrl = (id: string): string => encodeURI(id).replace(/\./g, "%2E");

/**
 * Builds a filesystem-safe file name from a (decoded) monument ID.
 */
const safeFileName = (id: string): string => id.replace(/[^\w\u00A0-\uFFFF.-]/g, "_");

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
   geometry: { type: "Point"; coordinates: [number, number] };
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
   const [lon, lat] = feature.geometry.coordinates;
   return {
      ...feature.properties,
      lat,
      lon,
      inventory: canonicalId,
   };
};

const renderContent = (props: MonumentProps): string => {
   const label = escapeHtml(props.itemLabel || "Abidə");
   const altLabel = props.itemAltLabel ? escapeHtml(props.itemAltLabel) : "";
   const description = props.itemDescription ? escapeHtml(props.itemDescription) : "";
   const inventory = escapeHtml(props.inventory || "");
   const imageUrl = props.image ? getOptimizedImage(props.image, 960) : "";
   const srcSet = props.image ? getSrcSet(props.image, [500, 960, 1280, 1920]) : "";
   const categoryUrl = getCategoryUrl(props);

   const links: string[] = [];
   if (props.item) {
      const qid = props.item.split("/").pop();
      links.push(
         `<li><a href="${escapeHtml(props.item)}">${escapeHtml(qid || "Wikidata")}</a></li>`,
      );
   }
   if (props.azLink) {
      links.push(`<li><a href="${escapeHtml(props.azLink)}">Vikipediya məqaləsi</a></li>`);
   }
   if (categoryUrl) {
      links.push(`<li><a href="${escapeHtml(categoryUrl)}">Vikianbar kateqoriyası</a></li>`);
   }

   let imageBlock = "";
   if (imageUrl) {
      const srcSetAttr = srcSet ? ` srcset="${escapeHtml(srcSet)}"` : "";
      imageBlock = `<img src="${escapeHtml(imageUrl)}"${srcSetAttr} alt="${label}" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;">`;
   } else {
      imageBlock = `<div style="display:flex;align-items:center;justify-content:center;height:200px;background:#f3f4f6;border-radius:8px;color:#9ca3af;">Şəkil yoxdur</div>`;
   }

   const linksBlock =
      links.length > 0
         ? `<ul style="margin:0;padding-left:1.25rem;line-height:1.75;">${links.join("")}</ul>`
         : "";

   const coords =
      typeof props.lat === "number" && typeof props.lon === "number"
         ? `<p style="color:#6b7280;font-size:0.875rem;">Koordinatlar: ${props.lat.toFixed(6)}, ${props.lon.toFixed(6)}</p>`
         : "";

   return `
      <div id="seo-content" style="min-height:100vh;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
         <article style="max-width:56rem;margin:0 auto;padding:2rem 1rem;">
            <nav style="margin-bottom:1.5rem;">
               <a href="/" style="color:#2563eb;text-decoration:none;">&larr; Xəritə</a>
            </nav>
            <div style="display:flex;flex-wrap:wrap;gap:2rem;">
               <div style="flex:1;min-width:16rem;">
                  <h1 style="font-size:1.875rem;font-weight:700;margin:0 0 0.5rem;">${label}</h1>
                  ${altLabel ? `<p style="color:#6b7280;font-style:italic;margin:0 0 0.5rem;">${altLabel}</p>` : ""}
                  <p style="color:#6b7280;font-size:0.875rem;margin:0 0 1rem;"><span style="background:#f3f4f6;padding:0.125rem 0.5rem;border-radius:4px;">#${inventory}</span></p>
                  ${description ? `<p style="line-height:1.6;margin:0 0 1rem;">${description}</p>` : ""}
                  ${coords}
                  ${linksBlock}
               </div>
               <div style="flex:1;min-width:16rem;">${imageBlock}</div>
            </div>
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

const buildHeadTags = (props: MonumentProps, canonicalUrl: string, title: string): string => {
   const description =
      props.itemDescription || "Azərbaycanın tarixi abidələri və mədəni irs xəritəsi";
   const ogImage = props.image ? getOptimizedImage(props.image, 1280) : `${HOST}/wlm-az.png`;
   const imagePreload = props.image
      ? `<link rel="preload" as="image" href="${escapeHtml(getOptimizedImage(props.image, 960))}">`
      : "";

   const monumentSchema = useMonumentSchema(props);
   monumentSchema.url = canonicalUrl;
   if (monumentSchema.image && typeof monumentSchema.image === "string") {
      monumentSchema.image = getOptimizedImage(monumentSchema.image);
   }
   const breadcrumbSchema = useBreadcrumbSchema([
      { name: "Ana Səhifə", url: `${HOST}/` },
      { name: props.itemLabel || "Abidə", url: canonicalUrl },
   ]);

   return `
      <meta name="description" content="${escapeHtml(description)}">
      <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
      <meta property="og:type" content="website">
      <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
      <meta property="og:site_name" content="Wiki Loves Monuments Azerbaijan">
      <meta property="og:title" content="${escapeHtml(props.itemLabel || title)}">
      <meta property="og:description" content="${escapeHtml(description)}">
      <meta property="og:image" content="${escapeHtml(ogImage)}">
      <meta property="twitter:card" content="summary_large_image">
      <meta property="twitter:title" content="${escapeHtml(props.itemLabel || title)}">
      <meta property="twitter:description" content="${escapeHtml(description)}">
      <meta property="twitter:image" content="${escapeHtml(ogImage)}">
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
): string => {
   const title = `${props.itemLabel || "Abidə"} | ${SITE_TITLE}`;
   let html = indexHtml;

   // Replace the default title.
   html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

   // Drop the homepage description/canonical/OG/Twitter tags so they don't conflict.
   html = html.replace(/<meta[^>]*name="description"[^>]*>/g, "");
   html = html.replace(/<link[^>]*rel="canonical"[^>]*>/g, "");
   html = html.replace(/<meta[^>]*property="og:[^>]*>/g, "");
   html = html.replace(/<meta[^>]*property="twitter:[^>]*>/g, "");

   // Insert per-page head tags before </head>.
   const headTags = buildHeadTags(props, canonicalUrl, title);
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
   html = html.replace(/<meta[^>]*property="og:url"[^>]*>/g, "");
   html = html.replace(
      "</head>",
      `\n      <meta name="description" content="${escapeHtml(description)}">
      <link rel="canonical" href="${escapeHtml(pageUrl)}">
      <meta property="og:url" content="${escapeHtml(pageUrl)}">
   </head>`,
   );
   return html;
};

const renderSitemap = (entries: SitemapEntry[]): string => {
   const urls = entries
      .map(
         (entry) =>
            `<url><loc>${escapeXml(entry.loc)}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
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

const main = async () => {
   try {
      const features = await readGeoJson();
      const indexHtml = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf-8");
      const now = new Date().toISOString();
      const sitemapEntries: SitemapEntry[] = [
         { loc: `${HOST}/`, lastmod: now },
         ...STATIC_PAGES.map(({ route }) => ({ loc: `${HOST}${route}`, lastmod: now })),
      ];

      await fs.mkdir(MONUMENT_DIR, { recursive: true });

      let written = 0;
      for (const feature of features) {
         const rawInventory = feature.properties.inventory || "";
         if (!rawInventory) continue;

         const canonicalId = rawInventory.split(",")[0].trim();
         const canonicalUrl = `${HOST}/monument/${encodeIdForUrl(canonicalId)}`;
         const props = buildMonumentProps(feature, canonicalId);

         const html = buildMonumentHtml(indexHtml, props, canonicalUrl);
         const filePath = path.join(MONUMENT_DIR, `${safeFileName(canonicalId)}.html`);
         await fs.writeFile(filePath, html);
         written++;

         sitemapEntries.push({
            loc: canonicalUrl,
            lastmod: feature.properties.lastModified
               ? new Date(feature.properties.lastModified).toISOString()
               : now,
         });
      }

      for (const page of STATIC_PAGES) {
         const html = buildStaticHtml(indexHtml, page.route, page.title, page.description);
         await fs.writeFile(path.join(DIST_DIR, `${page.route.slice(1)}.html`), html);
      }

      await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), renderSitemap(sitemapEntries));
      await fs.writeFile(path.join(DIST_DIR, "robots.txt"), ROBOTS_TXT);

      console.log(`Prerendered ${written} monument pages`);
      console.log(
         `Wrote ${STATIC_PAGES.length} static pages, sitemap.xml (${sitemapEntries.length} URLs), robots.txt`,
      );
   } catch (error) {
      console.error("Prerender failed:", error);
      process.exit(1);
   }
};

main();
