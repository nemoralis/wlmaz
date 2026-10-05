/**
 * Copy for the region map and the region detail pages.
 *
 * Single source of truth for the wording rendered by `RegionsPage.vue`,
 * `RegionPage.vue`, and the `useHead` metadata those pages set, so the
 * visible text and the search metadata cannot drift apart.
 *
 * Follows the same convention as the other content modules: relative imports
 * only, and no counts or region names hard-coded here. Both come from the
 * data at runtime.
 */

import { SITE_HOST } from "../utils/constants";

/** `/regions` — the interactive map of the administrative regions. */
export const REGIONS_TITLE = "Regionlar";

export const REGIONS_DESCRIPTION =
   "Azərbaycanın inzibati regionlarının xəritəsi. Region seçin və həmin regiondakı abidələrin siyahısına baxın.";

export const REGIONS_CANONICAL = `${SITE_HOST}/regions`;

/** Accessibility label for the <svg> wrapping the region links. */
export const REGIONS_MAP_ARIA_LABEL = "Azərbaycanın region xəritəsi";

/**
 * Hint line under the map. Names all four ways to change the view, because a
 * visitor who has not discovered that the map zooms will not go looking.
 */
export const REGIONS_MAP_HINT =
   "Region seçmək üçün xəritədə regiona klikləyin. Yaxınlaşdırmaq üçün + və − düymələrindən və ya siçan çarxından, sürüşdürmək üçün isə xəritəni dartın.";

/** Label of the group holding the zoom buttons. */
export const REGIONS_MAP_CONTROLS_LABEL = "Xəritəni idarə et";

export const REGIONS_MAP_ZOOM_IN_LABEL = "Xəritəni yaxınlaşdır";

export const REGIONS_MAP_ZOOM_OUT_LABEL = "Xəritəni uzaqlaşdır";

export const REGIONS_MAP_RESET_LABEL = "Xəritənin bütün görünüşünü göstər";

/** Visible text on the reset button; the aria-label carries the full wording. */
export const REGIONS_MAP_RESET_SHORT = "1:1";

/** Shown instead of the map when the generated payload cannot be loaded. */
export const REGIONS_MAP_ERROR = "Region xəritəsi yüklənə bilmədi.";

/** Heading of the monument table on a region page. */
export const REGIONS_MONUMENTS_HEADING = "Abidələr";

/** Heading of the photo gallery above the coverage stats. */
export const REGIONS_GALLERY_HEADING = "Fotoşəkillər";

/** Heading of the coverage counts above the monument table. */
export const REGIONS_STATS_HEADING = "Fotoşəkil vəziyyəti";

/** Trailing phrase after the percentage, e.g. "20% fotoşəkilləndirilib". */
export const REGIONS_STATS_PHOTOGRAPHED = "fotoşəkilləndirilib";

/**
 * How many thumbnails the gallery shows before counting the rest.
 *
 * A region's gallery ranges from 0 to 132 photographs, so showing all of them
 * would put over a hundred images on one page for Səbail while the median
 * region has three. The remainder is reported rather than hidden.
 */
export const REGIONS_GALLERY_LIMIT = 12;

/**
 * Note under the gallery when it is capped. Receives the number left over, so
 * the count can never drift from the list it describes.
 */
export const REGIONS_GALLERY_MORE = (remaining: number): string =>
   `Daha ${remaining} şəkil bu regionda var. Fərqli şəkilləri Wikivikadaxil etmək üçün səhifəyə baxın.`;

/** Labels of the three coverage counts. */
export const REGIONS_STATS = {
   total: "ümumi abidə",
   withPhoto: "şəkli var",
   withoutPhoto: "şəkli yoxdur",
} as const;

/** Accessible name of the coverage bar, e.g. "132 / 670 abidənin şəkli var". */
export const REGIONS_STATS_BAR_LABEL = (withPhoto: number, total: number): string =>
   `${withPhoto} / ${total} abidənin şəkli var`;

/**
 * Shown under the bar. Notes that this region's figure is computed over all its
 * monuments, where the site-wide figure counts only those with a page of their
 * own — otherwise the same "x% photographed" wording reads as a contradiction
 * when the two numbers are compared.
 */
export const REGIONS_STATS_FOOTNOTE =
   "Faiz bütün abidələr üzrə hesablanır. Ana səhifədəki faiz isə yalnız öz səhifəsi olan abidələr üzrə hesablanır.";

/**
 * Empty state for a region that no monument's `parentLabel` names. Kept
 * factual: it does not claim the region is empty in reality, only that none
 * are recorded under it.
 */
export const REGIONS_EMPTY_HINT = "Bu region üçün hələ abidə qeyd edilməyib.";

/** Suffix appended to a region's title, e.g. "Səbail — Viki Abidələri Sevir Azərbaycan". */
export const REGIONS_PAGE_TITLE_SUFFIX = "Viki Abidələri Sevir Azərbaycan";

/** Back-link from a region page to the map. */
export const REGIONS_BACK_LABEL = "Bütün regionlar";
