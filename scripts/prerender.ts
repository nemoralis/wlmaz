import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";
import {
   schemaToJsonLd,
   useBreadcrumbSchema,
   useMonumentSchema,
} from "../src/composables/useSchemaOrg";
import { ABOUT_DESCRIPTION } from "../src/content/about";
import { resolveHomeData, type HomeData } from "../src/content/featured";
import {
   CAMPAIGN,
   formatMonumentCount,
   HOME_DESCRIPTION,
   HOME_GAP_CTA,
   HOME_GAP_HEADING,
   HOME_GAP_NOTE,
   HOME_HEADLINE,
   HOME_INTRO,
   HOME_PRIMARY_CTA,
   HOME_REGIONS_HEADING,
   HOME_REGIONS_INTRO,
   HOME_SECONDARY_CTA,
   HOME_STEPS,
   HOME_STEPS_HEADING,
   HOME_STEPS_INTRO,
   isCampaignActive,
} from "../src/content/home";
import type { MonumentProps } from "../src/types";
import { SITE_HOST } from "../src/utils/constants";
import {
   encodeIdForUrl,
   findDuplicateLabels,
   getCanonicalId,
   getCategoryUrl,
   getDisplayLabel,
   getOptimizedImage,
   getSrcSet,
   safeFileName,
   toInventoryIds,
} from "../src/utils/monumentFormatters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = SITE_HOST;
const DIST_DIR = path.join(__dirname, "../dist");
const GEOJSON_PATH = path.join(__dirname, "../data/monuments.geojson");
const FEATURED_PATH = path.join(__dirname, "../data/featured-monuments.json");
const MONUMENT_DIR = path.join(DIST_DIR, "monument");
// Generated nginx include with exact-match 301s for the secondary register
// ids of a monument. Lives at the repo root (outside the web root) —
// gitignored; see nginx.conf's include directive.
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

/** GeoJSON properties as the app reads them: literals, plus an id list. */
type FeatureProperties = Omit<MonumentProps, "inventory"> & { inventory?: string[] };

interface MonumentFeature {
   type: "Feature";
   geometry: { type: "Point"; coordinates: [number, number] } | null;
   properties: FeatureProperties;
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

const buildMonumentProps = (feature: MonumentFeature): MonumentProps => {
   const props: MonumentProps = {
      ...feature.properties,
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
   // Chips/fact box list every register id; the map link carries just the canonical one
   const inventory = escapeHtml(toInventoryIds(props.inventory).join(", "));
   const mapInventory = encodeURIComponent(getCanonicalId(props.inventory));
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
         ? `<div style="border:1px solid #e5e7eb;border-radius:8px;background:#f3f4f6;padding:2rem;text-align:center;margin:1.5rem 0;"><a href="/map?inventory=${mapInventory}" style="color:#2563eb;text-decoration:none;font-weight:500;">Xəritədə baxın</a></div>`
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
   const displayLabel = getDisplayLabel(
      props.itemLabel,
      getCanonicalId(props.inventory),
      duplicateLabels,
   );
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

/**
 * The `#home-data` payload, inlined into every page that renders coverage
 * counts (the landing page and /about) so the first Vue render already has
 * them — no flash, no request. `<` is escaped so the JSON can never close the
 * script element.
 */
const buildHomeDataScript = (data: HomeData): string =>
   `<script type="application/json" id="home-data">${JSON.stringify(data).replace(
      /</g,
      "\\u003c",
   )}</script>`;

const buildStaticHtml = (
   indexHtml: string,
   route: string,
   pageTitle: string,
   description: string,
   payload?: string,
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
      ${payload ?? ""}
   </head>`,
   );
   return html;
};

/**
 * Landing-page body markup.
 *
 * Must stay in sync with `src/pages/Home.vue` — same Tailwind classes, same
 * copy module — so the prerendered page and its Vue counterpart render the
 * same thing. The classes are already in the compiled CSS because Tailwind
 * scans the Vue template.
 */
const buildHomeStaticContent = (data: HomeData): string => {
   const icon = (className: string) =>
      `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;

   // Collage: the large slot first, then the three small ones. Missing slots
   // render the same placeholder Home.vue shows while it waits for data.
   const gridClass = (index: number): string =>
      index === 0 ? "col-span-4 row-span-6" : "col-span-2 row-span-2";

   const collage = Array.from({ length: 4 }, (_, index) => {
      const monument = data.featured[index];
      if (!monument) {
         return `<div class="${gridClass(index)} rounded-xl bg-gradient-to-br from-gray-100 to-gray-200"></div>`;
      }

      const src = getOptimizedImage(monument.image, index === 0 ? 960 : 500);
      const srcSet = getSrcSet(monument.image, index === 0 ? [500, 768, 960, 1280] : [330, 500]);
      const sizes =
         index === 0 ? "(max-width: 1024px) 100vw, 40vw" : "(max-width: 1024px) 33vw, 20vw";
      const caption =
         index === 0
            ? `<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white">${escapeHtml(monument.label)}${monument.parentLabel ? ` · ${escapeHtml(monument.parentLabel)}` : ""}</div>`
            : "";

      return `<a href="${escapeHtml(monument.url)}" class="${gridClass(index)} group relative block overflow-hidden rounded-xl shadow-lg">
         <img src="${escapeHtml(src)}" srcset="${escapeHtml(srcSet)}" sizes="${escapeHtml(sizes)}" alt="${escapeHtml(monument.label)}" loading="${index === 0 ? "eager" : "lazy"}" fetchpriority="${index === 0 ? "high" : "auto"}" width="960" height="720" class="h-full w-full object-cover transition duration-500 group-hover:scale-105">
         ${caption}
      </a>`;
   }).join("");

   const countRow =
      data.total > 0
         ? `<div class="mt-6 flex items-center gap-6 text-sm text-gray-500">
            <div class="flex items-center gap-2"><span class="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden="true"></span>${formatMonumentCount(data.total)} abidə</div>
         </div>`
         : "";

   const campaign = isCampaignActive()
      ? `<section class="bg-white">
         <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div class="flex flex-col gap-4 rounded-2xl bg-[#8f0000] px-6 py-5 text-white shadow-sm sm:flex-row sm:items-center">
               <div class="min-w-0 flex-1">
                  <div class="text-lg font-semibold">${escapeHtml(CAMPAIGN.title)}</div>
                  <div class="mt-0.5 text-sm text-white/90">${escapeHtml(CAMPAIGN.body)}</div>
               </div>
               <a href="${escapeHtml(CAMPAIGN.href)}" target="_blank" rel="noopener" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#8f0000] transition hover:bg-gray-100">
                  ${escapeHtml(CAMPAIGN.cta)} ${icon("h-4 w-4")}
               </a>
            </div>
         </div>
      </section>`
      : "";

   // Step icons: inline SVG path data, matching the `v-if` chain in Home.vue's
   // step loop. FontAwesome components are unusable here (this file emits
   // hand-written HTML), so both paths inline the same geometry.
   const stepIconPath = (index: number): string =>
      [
         "M12 21s-7-4.35-9.33-8.24A5.5 5.5 0 0 1 12 6.5a5.5 5.5 0 0 1 9.33 6.26C19 16.65 12 21 12 21z",
         "M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v10A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-10zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
         "M7 17.5A4.5 4.5 0 0 1 7 8.5a5.5 5.5 0 0 1 10.5-1.6A4 4 0 0 1 17.5 17.5H7zM12 12v9m0-9l-3 3m3-3l3 3",
      ][index];

   // Photo-gap panel. Mirrors the `gap` computed in Home.vue: same integers, same
   // rounding, so the prerendered markup and the Vue render agree exactly.
   const gap =
      data.total > 0
         ? {
              total: data.total,
              withImage: data.withImage,
              without: Math.max(0, data.total - data.withImage),
              percent: Math.round((data.withImage / data.total) * 1000) / 10,
           }
         : null;

   const gapPanel =
      gap && gap.without > 0
         ? `<section class="border-y border-gray-200 bg-gradient-to-br from-blue-50 to-white">
         <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="grid items-center gap-8 lg:grid-cols-2">
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">${escapeHtml(HOME_GAP_HEADING)}</h2>
                  <p class="mt-2 text-lg text-gray-700">${formatMonumentCount(gap.without)} abidənin hələ fotoşəkili yoxdur.</p>
                  <a href="${HOME_GAP_CTA.to}" class="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                     ${escapeHtml(HOME_GAP_CTA.label)} ${icon("ml-2 h-5 w-5")}
                  </a>
                  <p class="mt-3 text-xs text-gray-500">${escapeHtml(HOME_GAP_NOTE)}</p>
               </div>
               <div>
                  <div class="flex items-baseline justify-between text-sm text-gray-600">
                     <span>${formatMonumentCount(gap.withImage)} fotoşəkilləndirilib</span>
                     <span>${formatMonumentCount(gap.total)} ümumi abidə</span>
                  </div>
                  <div class="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200" role="img" aria-label="${escapeHtml(`${formatMonumentCount(gap.withImage)} / ${formatMonumentCount(gap.total)} abidə çəkilib`)}">
                     <div class="h-full rounded-full bg-green-500" style="width:${gap.percent}%"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">${gap.percent}% fotoşəkilləndirilib</div>
               </div>
            </div>
         </div>
      </section>`
         : "";

   const regions = (data.regions ?? [])
      .map(
         (region) => `<li>
            <a href="/map" class="flex items-baseline justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
               <span class="min-w-0 truncate text-sm font-medium text-gray-800">${escapeHtml(region.label)}</span>
               <span class="flex-none text-sm font-semibold text-gray-500">${formatMonumentCount(region.count)}</span>
            </a>
         </li>`,
      )
      .join("");

   const regionsPanel = regions
      ? `<section class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">${escapeHtml(HOME_REGIONS_HEADING)}</h2>
               <p class="mt-3 text-gray-600">${escapeHtml(HOME_REGIONS_INTRO)}</p>
            </div>
            <ul class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">${regions}</ul>
         </div>
      </section>`
      : "";

   const steps = HOME_STEPS.map(
      (
         step,
         index,
      ) => `<li class="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
         <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${stepIconPath(index)}"/></svg>
         </div>
         <h3 class="mt-5 text-lg font-semibold text-gray-900">${escapeHtml(step.title)}</h3>
         <p class="mt-2 text-sm leading-relaxed text-gray-600">${escapeHtml(step.body)}</p>
      </li>`,
   ).join("");

   return `<div class="min-h-full bg-gray-50">
      <section class="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-amber-50">
         <div class="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
            <div class="grid items-center gap-10 lg:grid-cols-2">
               <div>
                  <h1 class="font-display text-4xl leading-tight font-bold text-gray-900 sm:text-5xl lg:text-6xl">${escapeHtml(HOME_HEADLINE)}</h1>
                  <p class="mt-6 text-lg leading-relaxed text-gray-700 sm:text-xl">${escapeHtml(HOME_INTRO)}</p>
                  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                     <a href="${HOME_PRIMARY_CTA.to}" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        ${escapeHtml(HOME_PRIMARY_CTA.label)}
                     </a>
                     <a href="${HOME_SECONDARY_CTA.to}" class="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset transition hover:bg-gray-50">
                        ${escapeHtml(HOME_SECONDARY_CTA.label)} ${icon("ml-2 h-4 w-4")}
                     </a>
                  </div>
                  ${countRow}
               </div>
               <div class="relative">
                  <div class="grid h-[420px] grid-cols-6 grid-rows-6 gap-3 sm:h-[500px]">${collage}</div>
               </div>
            </div>
         </div>
      </section>
      ${campaign}
      ${gapPanel}
      ${regionsPanel}
      <section class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">${escapeHtml(HOME_STEPS_HEADING)}</h2>
               <p class="mt-3 text-gray-600">${escapeHtml(HOME_STEPS_INTRO)}</p>
            </div>
            <ol class="mt-12 grid gap-6 md:grid-cols-3">${steps}</ol>
         </div>
      </section>
   </div>`;
};

/**
 * Rewrites the built SPA shell into the landing page: keeps the site-name
 * title and WebSite schema, refreshes the description and social card image,
 * and swaps the loading skeleton for the real markup plus the `#home-data`
 * payload Home.vue hydrates from.
 *
 * Only ever written to dist/index.html — every other page is generated from
 * the pristine shell, so /map and friends never inherit the home content.
 */
const buildHomeHtml = (indexHtml: string, data: HomeData): string => {
   let html = indexHtml;

   const heroImage = data.featured[0]
      ? getOptimizedImage(data.featured[0].image, 1280)
      : `${HOST}/wlm-az.png`;
   const metaTag = (attribute: string, name: string, content: string): string =>
      attribute === "property"
         ? `<meta property="${name}" content="${escapeHtml(content)}">`
         : `<meta name="${name}" content="${escapeHtml(content)}">`;

   // Description + social card: index.html predates the copy module and the
   // hero, so both are rewritten here rather than duplicated by hand.
   html = html.replace(
      /<meta[^>]*name="description"[^>]*>/g,
      metaTag("name", "description", HOME_DESCRIPTION),
   );
   html = html.replace(
      /<meta[^>]*property="og:description"[^>]*>/g,
      metaTag("property", "og:description", HOME_DESCRIPTION),
   );
   html = html.replace(
      /<meta[^>]*name="twitter:description"[^>]*>/g,
      metaTag("name", "twitter:description", HOME_DESCRIPTION),
   );
   html = html.replace(
      /<meta[^>]*property="og:image"[^>]*>/g,
      metaTag("property", "og:image", heroImage),
   );
   html = html.replace(
      /<meta[^>]*name="twitter:image"[^>]*>/g,
      metaTag("name", "twitter:image", heroImage),
   );

   // Payload + scrollable static content (the shell pins html/body to
   // overflow:hidden for the map app).
   const embeddedData = buildHomeDataScript(data);
   const styleOverride = "<style>html, body { overflow: auto !important; height: auto; }</style>";
   html = html.replace("</head>", `${embeddedData}\n   ${styleOverride}\n   </head>`);

   const appStart = html.indexOf('<div id="app">');
   const bodyClose = html.indexOf("</body>");
   const appContentEnd = html.lastIndexOf("</div>", bodyClose);
   if (appStart === -1 || bodyClose === -1 || appContentEnd === -1) {
      throw new Error("Could not locate #app container in index.html");
   }
   const contentStart = appStart + '<div id="app">'.length;
   html = `${html.slice(0, contentStart)}${buildHomeStaticContent(data)}\n   ${html.slice(appContentEnd)}`;

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
      route: "/map",
      title: "Xəritə",
      description:
         "Azərbaycanın tarixi abidələrinin interaktiv xəritəsi: abidəni tapın, koordinat və inventar nömrəsini görün və şəkil yükləyin.",
   },
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
      description: ABOUT_DESCRIPTION,
   },
];

const minifyHtml = (html: string): Promise<string> =>
   minify(html, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
   });

/**
 * Builds the nginx include that 301s every secondary register id to its
 * monument's canonical page (e.g. /monument/4655 → /monument/302).
 * Only page-bearing (located, inventoried) features contribute: their
 * canonical id has a real page to land on. An id that already has its own
 * page is skipped so a live URL is never hijacked away from its own page.
 */
const buildRedirectConf = (pageFeatures: MonumentFeature[]): string => {
   const canonicalIds = new Set(pageFeatures.map((f) => getCanonicalId(f.properties.inventory)));
   const redirectByPart = new Map<string, string>();
   for (const feature of pageFeatures) {
      const parts = toInventoryIds(feature.properties.inventory);
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
      "# Exact-match 301s: secondary register ids → the canonical monument page.",
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
      const pageFeatures = locatedFeatures.filter(
         (feature) => feature.properties.inventory?.length,
      );
      // Labels shared by several page-bearing monuments get the inventory id
      // appended in <title>/og:title ("Yaşayış evi (4996-12)") so no two
      // prerendered pages collide in the SERPs.
      const duplicateLabels = findDuplicateLabels(
         pageFeatures.map((feature) => feature.properties.itemLabel),
      );

      // Landing page payload: curated hero collage + coverage counts. Strict —
      // a bad id in data/featured-monuments.json fails the build rather than
      // shipping a hero with an empty slot.
      const featuredIds = JSON.parse(await fs.readFile(FEATURED_PATH, "utf-8")) as string[];
      const homeData = resolveHomeData(features, featuredIds, { strict: true });

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
               const canonicalId = getCanonicalId(feature.properties.inventory);
               if (!canonicalId) return;

               const canonicalUrl = `${HOST}/monument/${encodeIdForUrl(canonicalId)}`;
               const props = buildMonumentProps(feature);

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
         written += batch.filter((f) => f.properties.inventory?.length).length;
      }

      for (const page of STATIC_PAGES) {
         const html = buildStaticHtml(
            indexHtml,
            page.route,
            page.title,
            page.description,
            // /about shows the coverage counts in its hero, so it needs the same
            // payload the landing page gets — otherwise the numbers only appear
            // after a client-side fetch of /home-data.json.
            page.route === "/about" ? buildHomeDataScript(homeData) : undefined,
         );
         await fs.writeFile(
            path.join(DIST_DIR, `${page.route.slice(1)}.html`),
            await minifyHtml(html),
         );
      }

      // Landing page last and from the pristine shell, so /map and the rest
      // never inherit the home markup. The payload is rewritten alongside it
      // so Home.vue's fallback always matches the shipped geojson.
      await fs.writeFile(
         path.join(DIST_DIR, "index.html"),
         await minifyHtml(buildHomeHtml(indexHtml, homeData)),
      );
      await fs.writeFile(
         path.join(DIST_DIR, "home-data.json"),
         `${JSON.stringify(homeData, null, 2)}\n`,
      );

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
      console.log(
         `Landing page: ${homeData.featured.length} featured monuments, ${homeData.total} located (${homeData.withImage} photographed)`,
      );
   } catch (error) {
      console.error("Prerender failed:", error);
      process.exit(1);
   }
};

main();
