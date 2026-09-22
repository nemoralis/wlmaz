/**
 * Shared application constants (production host, MediaWiki API batch sizes).
 *
 * Dependency-free so it can be imported by server code, SSG scripts and
 * client modules alike without import cycles.
 */

/** Production site host with scheme (no trailing slash), used for canonical URLs. */
export const SITE_HOST = "https://wikilovesmonuments.az";

/**
 * Maximum number of titles sent per MediaWiki titles= query/batch. Mirrors the
 * upstream API limit and keeps one request within safe URL/length bounds.
 */
export const MEDIAWIKI_TITLES_PER_REQUEST = 50;