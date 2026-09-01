/**
 * Pure helpers for building batch upload titles with auto-incremented numbers.
 *
 * Kept free of any I/O so the "skip already-taken numbers" logic can be
 * unit-tested without a MediaWiki API.
 */

const TITLES_PER_BATCH = 50;

/** Builds a numbered title for a given base, e.g. ("Monument ", 2) -> "Monument 2". */
export const titleForNumber = (baseTitle: string, number: number): string =>
   `${baseTitle.trim()} ${number}`;

/**
 * Returns the first `count` free numbered titles derived from `baseTitle`
 * (i.e. "`baseTitle` 1", "`baseTitle` 2", ...). Numbers whose title already
 * exists (per the `check` predicate) are skipped, so gaps and already-taken
 * leading numbers are handled by moving to the next free number.
 *
 * `check` receives a batch of candidate titles (max 50) and must resolve to the
 * set of those candidates that are already taken.
 */
export async function nextFreeTitles(
   baseTitle: string,
   count: number,
   check: (candidates: string[]) => Promise<Set<string>>,
): Promise<string[]> {
   const accepted: string[] = [];
   let number = 1;

   while (accepted.length < count) {
      const batch = Array.from({ length: TITLES_PER_BATCH }, (_, i) =>
         titleForNumber(baseTitle, number + i),
      );
      const existing = await check(batch);

      for (const candidate of batch) {
         if (accepted.length >= count) break;
         if (!existing.has(candidate)) accepted.push(candidate);
      }

      number += TITLES_PER_BATCH;
   }

   return accepted;
}