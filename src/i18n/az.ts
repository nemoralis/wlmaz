/**
 * Azerbaijani translations for Codex components
 * Used with Codex's useI18n composable via provide('CdxI18nFunction', ...)
 */

type I18nParams = (string | number)[];

const messages: Record<string, string | ((...params: I18nParams) => string)> = {
   // Table Pager - Items per page
   "cdx-table-pager-items-per-page-default": "Səhifədə sıra sayı",
   "cdx-table-pager-items-per-page-current": (n: number) => `Səhifədə ${n} sıra`,

   // Table Pager - Navigation buttons
   "cdx-table-pager-button-first-page": "Birinci səhifə",
   "cdx-table-pager-button-next-page": "Növbəti səhifə",
   "cdx-table-pager-button-prev-page": "Əvvəlki səhifə",
   "cdx-table-pager-button-last-page": "Son səhifə",

   // Table Pagination Status Messages
   "cdx-table-pagination-status-message-determinate-short": (start: number, end: number, total: number) =>
      `${start}–${end} / ${total}`,
   "cdx-table-pagination-status-message-determinate-long": (start: number, end: number, total: number) =>
      `${start}–${end} sıra (cəmi ${total})`,
   "cdx-table-pagination-status-message-indeterminate-short": (start: number, end: number) =>
      `${start}–${end} sıra`,
   "cdx-table-pagination-status-message-indeterminate-long": (start: number, end: number) =>
      `${start}–${end} sıra göstərilir`,
   "cdx-table-pagination-status-message-indeterminate-final": (start: number, end: number, total: number) =>
      `${start}–${end} / ${total} (son)`,
   "cdx-table-pagination-status-message-pending": "Yüklənir...",

   // Table - Sort and Select
   "cdx-table-sort-caption": (column: string, direction: string) =>
      `${column} sütununa görə ${direction === "ascending" ? "artan" : "azalan"} sıralama`,
   "cdx-table-select-row-label": (row: number, total: number) => `Sıra ${row} / ${total}`,
   "cdx-table-select-all-label": "Bütün sıraları seç",

   // Search Input
   "cdx-search-input-search-button-label": "Axtar",

   // Dialog
   "cdx-dialog-close-button-label": "Bağla",

   // Message
   "cdx-message-dismiss-button-label": "Rədd et",

   // Label
   "cdx-label-optional-flag": "(istəyə bağlı)",
};

/**
 * Codex i18n function
 * Returns translated message for the given key, or null if not found
 */
export function cdxI18n(messageKey: string, ...params: I18nParams): string | null {
   const message = messages[messageKey];

   if (message === undefined) {
      return null; // Let Codex use default
   }

   if (typeof message === "function") {
      return message(...params);
   }

   return message;
}

export default messages;
