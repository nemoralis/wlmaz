/**
 * Upload payload shaping: request validation + Commons wikitext assembly.
 *
 * The upload route calls these in order: validate the raw body
 * (parseUploadFields), sanitize the values (the sanitizers in
 * `sanitize.ts`), then assemble the page wikitext (buildUploadWikitext).
 * Kept in one module so the pipeline's contract — validate → sanitize →
 * assemble — reads in one place. Everything here is pure and
 * dependency-free (apart from shared type predicates) so the route and the
 * tests share it.
 */

import { isRecord } from "@/utils/typeGuards.ts";

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

/** The text fields accepted by `POST /upload`. */
export interface UploadRequestFields {
   title: string;
   description: string;
   license?: string;
   lat?: string;
   lon?: string;
   categories?: string;
   inventory?: string;
   capturedAt?: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_OPTIONAL_LENGTH = 255;
const MAX_CAPTURED_AT_LENGTH = 20;
const MAX_TITLES = 50;
const MAX_FILE_TITLE_LENGTH = 255;

const optionalString = (
   body: Record<string, unknown>,
   key: string,
): { ok: true; value: string | undefined } | { ok: false; error: string } => {
   const value = body[key];
   if (value === undefined || value === null) return { ok: true, value: undefined };
   if (typeof value !== "string") return { ok: false, error: `Invalid ${key} field` };
   return { ok: true, value };
};

/**
 * Validates the text fields of a single-file upload.
 *
 * Express bodies are untrusted: multipart fields can arrive as arrays, and
 * JSON endpoints can contain any shape at all. This rejects everything that
 * is not the expected string/string[] shape before the route sanitizes
 * values or talks to MediaWiki.
 */
export const parseUploadFields = (body: unknown): ParseResult<UploadRequestFields> => {
   if (!isRecord(body)) return { ok: false, error: "Missing title or description" };

   const { title, description } = body;
   if (typeof title !== "string" || typeof description !== "string") {
      return { ok: false, error: "Missing title or description" };
   }

   const license = optionalString(body, "license");
   if (!license.ok) return license;
   const lat = optionalString(body, "lat");
   if (!lat.ok) return lat;
   const lon = optionalString(body, "lon");
   if (!lon.ok) return lon;
   const categories = optionalString(body, "categories");
   if (!categories.ok) return categories;
   const inventory = optionalString(body, "inventory");
   if (!inventory.ok) return inventory;
   const capturedAt = optionalString(body, "capturedAt");
   if (!capturedAt.ok) return capturedAt;

   if (
      title.length > MAX_TITLE_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH ||
      (categories.value !== undefined && categories.value.length > MAX_OPTIONAL_LENGTH) ||
      (inventory.value !== undefined && inventory.value.length > MAX_OPTIONAL_LENGTH) ||
      (capturedAt.value !== undefined && capturedAt.value.length > MAX_CAPTURED_AT_LENGTH)
   ) {
      return { ok: false, error: "Input too long" };
   }

   return {
      ok: true,
      value: {
         title,
         description,
         license: license.value,
         lat: lat.value,
         lon: lon.value,
         categories: categories.value,
         inventory: inventory.value,
         capturedAt: capturedAt.value,
      },
   };
};

/**
 * Validates `POST /upload/titles-exist`.
 *
 * Empty entries are ignored, the first {@link MAX_TITLES} non-empty titles are
 * kept (matching the MediaWiki batch limit), and anything that is not a string
 * is rejected rather than coerced.
 */
export const parseTitlesExistRequest = (body: unknown): ParseResult<string[]> => {
   if (!isRecord(body) || !Array.isArray(body.titles)) {
      return { ok: false, error: "Missing titles parameter" };
   }

   const titles: string[] = [];
   for (const item of body.titles) {
      if (item === undefined || item === null) continue;
      if (typeof item !== "string") return { ok: false, error: "Invalid titles parameter" };

      const title = item.trim();
      if (!title) continue;

      titles.push(title);
      if (titles.length === MAX_TITLES) break;
   }

   if (titles.length === 0) return { ok: false, error: "Missing titles parameter" };
   if (titles.some((title) => title.length > MAX_FILE_TITLE_LENGTH)) {
      return { ok: false, error: "Title too long" };
   }

   return { ok: true, value: titles };
};

// ---------------------------------------------------------------------------
// Wikitext assembly
// ---------------------------------------------------------------------------

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
         m >= 1 &&
         m <= 12 &&
         d >= 1 &&
         d <= 31 &&
         h >= 0 &&
         h <= 23 &&
         min >= 0 &&
         min <= 59 &&
         s >= 0 &&
         s <= 59 &&
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

      if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && !Number.isNaN(parsed.getTime())) {
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

   if (!isNaN(latF) && !isNaN(lonF) && latF >= -90 && latF <= 90 && lonF >= -180 && lonF <= 180) {
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
   const { description, licenseTemplate, username, capturedAt, lat, lon, categories, inventory } =
      params;

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
