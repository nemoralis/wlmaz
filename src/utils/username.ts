/**
 * Shared validation for Wikimedia usernames used by API routes.
 *
 * Usernames are Unicode account names, so an ASCII-only rule rejects real
 * participants such as `Rəcəb Yaxşı`. The goal here is not to reproduce the
 * full MediaWiki account-name policy; it is to reject values that could be
 * interpreted as path/query separators, MediaWiki delimiters, or log/Redis
 * control data before the name is used as a lookup key.
 */
export function isValidWikiUsername(username: unknown): username is string {
   if (typeof username !== "string") return false;
   if (username.length < 1 || username.length > 255) return false;
   if (username.trim() !== username) return false;

   // Reject C0/C1-style controls, DEL, and characters that have special
   // meaning in URLs, MediaWiki titles, or query/API parameters.
   return !/[\u0000-\u001f\u007f|=\/\[\]{}<>:#&%$@!*+?,;\\]/.test(username);
}
