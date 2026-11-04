/**
 * Small runtime predicates shared by API response guards and request
 * validators. Keeping them in one place means every parser agrees on what
 * "an object" and "a number" mean (notably: `NaN`/`Infinity` and arrays are
 * not accepted).
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
   typeof value === "object" && value !== null && !Array.isArray(value);

export const isFiniteNumber = (value: unknown): value is number =>
   typeof value === "number" && Number.isFinite(value);
