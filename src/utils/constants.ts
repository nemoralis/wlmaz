/**
 * Shared application constants (production host, MediaWiki API batch sizes).
 *
 * Dependency-free so it can be imported by server code, SSG scripts and
 * client modules alike without import cycles.
 */

/** Production site host with scheme (no trailing slash), used for canonical URLs. */
export const SITE_HOST = "https://wikilovesmonuments.az";

/** Site name used as the root <title> and in page-title suffixes. */
export const SITE_TITLE = "Viki Abidələri Sevir Azərbaycan";

/**
 * Meta description of the root (map) page. Mirrors index.html byte-for-byte:
 * the runtime head in MapPage.vue and the prerender verifier compare against it.
 */
export const SITE_DESCRIPTION =
   "Viki Abidələri Sevir Azərbaycan — Azərbaycanın tarixi abidələri və mədəni irs xəritəsi. Abidəni xəritədə tapın, pulsuz şəkil çəkin və Wikimedia Commons-a yükləyin.";

/**
 * Maximum number of titles sent per MediaWiki titles= query/batch. Mirrors the
 * upstream API limit and keeps one request within safe URL/length bounds.
 */
export const MEDIAWIKI_TITLES_PER_REQUEST = 50;
