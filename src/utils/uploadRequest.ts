/**
 * Runtime validation for upload request bodies.
 *
 * Express bodies are untrusted: multipart fields can arrive as arrays, and
 * JSON endpoints can contain any shape at all. These parsers reject everything
 * that is not the expected string/string[] shape before the route sanitizes
 * values or talks to MediaWiki.
 *
 * Dependency-free so the route and tests can share them.
 */

import { isRecord } from "@/utils/typeGuards.ts";

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

/** Validates the text fields of a single-file upload. */
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
