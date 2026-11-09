/**
 * `localStorage` access that can never throw, plus JSON read/write helpers
 * built on it.
 *
 * Every client cache lives on the same untrusted surface: blocked storage
 * (privacy settings), quota errors, hand-edited entries. Centralizing the
 * try/catch here means composables only decide what a missing/invalid entry
 * *means* (fall back to the network, drop the entry, …) instead of
 * re-implementing the safety net each time.
 */

/** Raw string read; `null` when absent or storage is unavailable. */
export function readStorage(key: string): string | null {
   try {
      return localStorage.getItem(key);
   } catch (e) {
      console.warn("Failed to read storage", e);
      return null;
   }
}

/** Raw string write; failures are swallowed (caching is best-effort). */
export function writeStorage(key: string, value: string): void {
   try {
      localStorage.setItem(key, value);
   } catch (e) {
      console.warn("Failed to write storage", e);
   }
}

/** Best-effort delete; failures are swallowed. */
export function removeStorage(key: string): void {
   try {
      localStorage.removeItem(key);
   } catch {
      // Nothing sensible to do when storage is unusable.
   }
}

/**
 * Reads and validates a JSON entry. Returns `null` when absent; throws on
 * malformed JSON or a value the parser rejects, so callers can distinguish
 * "no cache" from "corrupt cache" (the latter usually deletes the entry).
 */
export function readJson<T>(key: string, parse: (value: unknown) => T): T | null {
   const raw = readStorage(key);
   if (!raw) return null;
   return parse(JSON.parse(raw));
}

/** Serializes and stores a JSON entry. */
export function writeJson(key: string, value: unknown): void {
   writeStorage(key, JSON.stringify(value));
}
