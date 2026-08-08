/**
 * Sanitization helpers for user-supplied upload metadata.
 *
 * Kept as pure functions (no Node/Express dependencies) so the security-critical
 * logic can be unit-tested in isolation and reused outside the upload route.
 */

/**
 * Strips wikitext control characters that could be used to inject links,
 * categories or templates into Wikimedia Commons page content.
 */
export const sanitizeWikitext = (text: string): string =>
   String(text || "")
      .replace(/[\[\]{}|]/g, "")
      .trim();

/**
 * Sanitizes a value into a safe Wikimedia Commons filename:
 * - Truncated to 128 chars
 * - Control characters removed
 * - Forbidden filename characters replaced with underscores
 * - Cannot start with a space or dot
 */
export const sanitizeFilename = (name: string): string =>
   String(name || "")
      .slice(0, 128) // Truncate to 128 chars
      .replace(/[\x00-\x1F\x7F]/g, "") // Strip control characters
      .replace(/[#<>\[\]|{}\/:\?%\*\\\^]/g, "_") // More comprehensive forbidden char list
      .replace(/^[\s\.]+/, "") // Cannot start with space or dot
      .trim();

/**
 * Maps a license key to its Wikimedia Commons wikitext template.
 * Unknown/missing licenses default to cc-by-sa-4.0.
 */
export const mapLicenseTemplate = (license: string | undefined): string => {
   if (license === "cc-by-4.0") return "{{self|cc-by-4.0}}";
   if (license === "cc0") return "{{self|cc0}}";
   return "{{self|cc-by-sa-4.0}}";
};
