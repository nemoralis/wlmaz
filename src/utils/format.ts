/**
 * Shared Azerbaijani-locale formatters.
 *
 * Each `Intl` instance is hoisted so list renders (leaderboard rows, stat
 * cards, chart tooltips) don't pay formatter construction per cell. The four
 * shapes cover every call site: long/short dates, day+month, date+time, and
 * grouped numbers. Dependency-free: safe for browser, server and scripts.
 */

const numberFormatter = new Intl.NumberFormat("az-AZ");

/** Grouped numbers, e.g. `12 345`. */
export const formatNumber = (value: number): string => numberFormatter.format(value);

/** `5 fevral 2026` — registration dates, tooltips with a year. */
export const dateLong = new Intl.DateTimeFormat("az-AZ", {
   year: "numeric",
   month: "long",
   day: "numeric",
});

/** `5 fev 2026` — leaderboard rows, compact tables. */
export const dateShort = new Intl.DateTimeFormat("az-AZ", {
   year: "numeric",
   month: "short",
   day: "numeric",
});

/** `5 fev` — chart axis/tooltips for one event's daily series. */
export const dateDayMonth = new Intl.DateTimeFormat("az-AZ", { day: "numeric", month: "short" });

/** `5 fevral 2026, 14:30` — freshness timestamps. */
export const dateTime = new Intl.DateTimeFormat("az-AZ", {
   dateStyle: "medium",
   timeStyle: "short",
});
