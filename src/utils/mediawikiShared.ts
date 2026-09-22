/**
 * Shared MediaWiki API helpers used by both the OAuth client (mediawiki.ts)
 * and the local bot-password client (mediawikiBotClient.ts).
 *
 * These are pure, dependency-free translations so the two clients stay in
 * lock-step on title normalization and upload-warning handling.
 */

import type { MediaWikiUploadResult } from "@/types/mediawiki.ts";

/**
 * Warning keys in priority order — the first key present becomes the upload
 * error code. Mirrors the ordering Commons itself uses for display.
 */
const WARNING_PRIORITY = [
   "exists",
   "fileexists-shared-forbidden",
   "fileexists",
   "no-change",
   "duplicateversions",
   "duplicate",
   "duplicate-archive",
   "was-deleted",
   "badfilename",
];

/**
 * Folds a raw MediaWiki title into a comparable key: drops the File: prefix,
 * normalizes underscores to spaces, collapses whitespace, trims, lowercases.
 * Used when checking whether an uploaded title already exists.
 */
export function normalizeWikiTitle(title: string): string {
   return title
      .replace(/^File:/i, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
}

/**
 * When an upload result reports `result === "Warning"` or carries warnings,
 * returns the most specific warning as `{ code, info }` so callers can throw
 * it as a {@link CommonsUploadError}. Returns null when the result is clean.
 *
 * Without this treatment, a duplicate/existing title would silently create a
 * new version instead of failing the upload.
 */
export function pickUploadWarning(
   uploadResult?: MediaWikiUploadResult | null,
): { code: string; info?: string } | null {
   const hasWarnings = !!uploadResult?.warnings && Object.keys(uploadResult.warnings).length > 0;
   if (!uploadResult || (uploadResult.result !== "Warning" && !hasWarnings)) return null;

   const warnings = uploadResult.warnings || {};
   const primary =
      WARNING_PRIORITY.find((key) => key in warnings) || Object.keys(warnings)[0] || "warning";
   const raw = warnings[primary];
   const info = Array.isArray(raw) ? raw.join(", ") : raw;
   return { code: primary, info: info ? String(info) : undefined };
}