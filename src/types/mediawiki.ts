/**
 * Minimal structural types for the MediaWiki API responses we consume.
 * Only the fields the app reads are modelled; unknown extra fields are allowed.
 */

/** Error object returned by the MediaWiki API for failed requests. */
export interface MediaWikiApiError {
   code: string;
   info?: string;
}

/** `?pages` object keyed by page id (`formatversion` unspecified / 1). */
export interface MediaWikiPageV1 {
   title?: string;
   missing?: string;
}

/** A `query` block as returned by common read-only calls. */
export interface MediaWikiQuery {
   tokens?: {
      logintoken?: string;
      csrftoken?: string;
   };
   pages?: Record<string, MediaWikiPageV1 | undefined>;
}

/** Top-level response of a MediaWiki write/read API call we consume. */
export interface MediaWikiApiResponse {
   error?: MediaWikiApiError;
   query?: MediaWikiQuery;
   login?: {
      result?: string;
   };
   upload?: MediaWikiUploadResult;
}

/** `upload` block returned by `action=upload`. */
export interface MediaWikiUploadResult {
   result?: string;
   filename?: string;
   warnings?: Record<string, string | string[]>;
   imageinfo?: {
      descriptionurl?: string;
   };
}