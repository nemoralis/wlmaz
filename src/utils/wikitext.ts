/**
 * Pure functions for generating Wikimedia Commons upload wikitext.
 *
 * These functions have NO Express, Node, or network dependencies — they
 * accept sanitized strings and return wikitext. This makes them trivially
 * unit-testable and safe to call from any context.
 */

export interface UploadWikitextContent {
   /** Sanitized file description. */
   description: string;
   /** License wikitext template (from mapLicenseTemplate). */
   licenseTemplate: string;
   /** Sanitized Wikimedia username. */
   username: string;
   /** EXIF capture date as "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD", or undefined to use today. */
   capturedAt?: string;
   /** Raw latitude string from the request. */
   lat?: string;
   /** Raw longitude string from the request. */
   lon?: string;
   /** Sanitized Commons category name, or undefined. */
   categories?: string;
   /** Sanitized canonical inventory ID, or undefined. */
   inventory?: string;
}

/**
 * Builds a date string in "YYYY-MM-DD HH:MM:SS" format from a capture date.
 * Accepts "YYYY-MM-DD HH:MM:SS" (with time) or "YYYY-MM-DD" (date only).
 * Falls back to today's UTC date at midnight when the input is missing or invalid.
 */
export function buildDateTemplate(capturedAt?: string): string {
   const now = new Date();
   const pad = (n: number) => String(n).padStart(2, "0");
   const fallback = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} 00:00:00`;

   if (typeof capturedAt !== "string") {
      return fallback;
   }

   // Full datetime: "YYYY-MM-DD HH:MM:SS"
   const dtMatch = capturedAt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
   if (dtMatch) {
      const [, yS, mS, dS, hS, minS, sS] = dtMatch;
      const y = Number(yS);
      const m = Number(mS);
      const d = Number(dS);
      const h = Number(hS);
      const min = Number(minS);
      const s = Number(sS);
      const parsed = new Date(Date.UTC(y, m - 1, d, h, min, s));

      if (
         m >= 1 && m <= 12 &&
         d >= 1 && d <= 31 &&
         h >= 0 && h <= 23 &&
         min >= 0 && min <= 59 &&
         s >= 0 && s <= 59 &&
         !Number.isNaN(parsed.getTime())
      ) {
         return `${y}-${mS}-${dS} ${hS}:${minS}:${sS}`;
      }

      return fallback;
   }

   // Date only: "YYYY-MM-DD"
   const dateMatch = capturedAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if (dateMatch) {
      const [, yS, mS, dS] = dateMatch;
      const y = Number(yS);
      const m = Number(mS);
      const d = Number(dS);
      const parsed = new Date(Date.UTC(y, m - 1, d));

      if (
         m >= 1 && m <= 12 &&
         d >= 1 && d <= 31 &&
         !Number.isNaN(parsed.getTime())
      ) {
         return `${y}-${mS}-${dS} 00:00:00`;
      }

      return fallback;
   }

   return fallback;
}

/**
 * Builds a MediaWiki {{Location}} template from coordinate strings.
 * Returns an empty string when coordinates are missing or out of range.
 */
export function buildLocationTemplate(lat?: string, lon?: string): string {
   const latF = parseFloat(lat ?? "");
   const lonF = parseFloat(lon ?? "");

   if (
      !isNaN(latF) &&
      !isNaN(lonF) &&
      latF >= -90 &&
      latF <= 90 &&
      lonF >= -180 &&
      lonF <= 180
   ) {
      return `\n{{Location|${latF}|${lonF}}}`;
   }

   return "";
}

/**
 * Builds a {{Cultural Heritage Azerbaijan}} template line.
 * Returns an empty string when no inventory ID is provided.
 */
export function buildHeritageTemplate(inventory?: string): string {
   if (inventory) {
      return `\n{{Cultural Heritage Azerbaijan|${inventory}}}`;
   }
   return "";
}

/**
 * Builds a [[Category:Name]] line.
 * Returns an empty string when no category is provided.
 */
export function buildCategoryText(categories?: string): string {
   if (categories) {
      return `\n[[Category:${categories}]]`;
   }
   return "";
}

/**
 * Assembles the complete wikitext for a Wikimedia Commons file page.
 *
 * All inputs must be pre-sanitized by the caller (sanitizeWikitext,
 * sanitizeFilename, getCanonicalId, etc.). This function performs no
 * sanitization — it is a pure string assembler.
 */
export function buildUploadWikitext(params: UploadWikitextContent): string {
   const {
      description,
      licenseTemplate,
      username,
      capturedAt,
      lat,
      lon,
      categories,
      inventory,
   } = params;

   const dateTemplate = buildDateTemplate(capturedAt);
   const locationTemplate = buildLocationTemplate(lat, lon);
   const heritageLine = buildHeritageTemplate(inventory);
   const categoryText = buildCategoryText(categories);

   return `== {{int:filedesc}} ==
{{Information
|description={{en|1=${description}}}${heritageLine}
|date=${dateTemplate}
|source={{own}}
|author=[[User:${username}|${username}]]
|permission=
|other_versions=
}}
${locationTemplate}

== {{int:license-header}} ==
${licenseTemplate}
{{Wiki Loves Monuments 2026|az}}

${categoryText}
`;
}
