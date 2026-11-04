/**
 * Runtime parsers for the backend response types in `src/types/api.ts`.
 *
 * TypeScript interfaces disappear at runtime, so every network response is
 * untrusted input. These parsers validate the fields the app actually reads
 * and construct a fresh typed object; unknown extra fields are ignored. They
 * throw on malformed input, which `apiFetch` turns into an `ApiError` with
 * code "invalid_response".
 *
 * Dependency-free so they can run in the browser and in tests.
 */

import type {
   AuthLogoutResponse,
   PublicWikiUser,
   TitlesExistResponse,
   UploadConfigResponse,
   UploadStatusResponse,
   UserStats,
   WikiLovesUserData,
} from "@/types/api.ts";
import { isFiniteNumber, isRecord } from "@/utils/typeGuards.ts";

const invalid = (label: string): TypeError => new TypeError(`Invalid ${label} response`);

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
   if (!isRecord(value)) throw invalid(label);
   return value;
};

const stringField = (record: Record<string, unknown>, key: string, label: string): string => {
   const value = record[key];
   if (typeof value !== "string") throw invalid(label);
   return value;
};

const optionalString = (
   record: Record<string, unknown>,
   key: string,
   label: string,
): string | undefined => {
   const value = record[key];
   if (value === undefined || value === null) return undefined;
   if (typeof value !== "string") throw invalid(label);
   return value;
};

const optionalBoolean = (
   record: Record<string, unknown>,
   key: string,
   label: string,
): boolean | undefined => {
   const value = record[key];
   if (value === undefined || value === null) return undefined;
   if (typeof value !== "boolean") throw invalid(label);
   return value;
};

const booleanField = (record: Record<string, unknown>, key: string, label: string): boolean => {
   const value = record[key];
   if (typeof value !== "boolean") throw invalid(label);
   return value;
};

const stringArrayField = (
   record: Record<string, unknown>,
   key: string,
   label: string,
): string[] => {
   const value = record[key];
   if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
      throw invalid(label);
   }
   return [...value];
};

const numberField = (record: Record<string, unknown>, key: string, label: string): number => {
   const value = record[key];
   if (!isFiniteNumber(value)) throw invalid(label);
   return value;
};

const parseYearly = (
   value: unknown,
   label: string,
): Record<number, { count: number; usage: number }> | undefined => {
   if (value === undefined || value === null) return undefined;
   const record = asRecord(value, label);
   const yearly: Record<number, { count: number; usage: number }> = {};

   for (const [year, entry] of Object.entries(record)) {
      if (!/^\d{4}$/.test(year)) throw invalid(label);
      const data = asRecord(entry, label);
      yearly[Number(year)] = {
         count: numberField(data, "count", label),
         usage: numberField(data, "usage", label),
      };
   }

   return yearly;
};

/** Validates `GET /upload/status`. */
export const parseUploadStatusResponse = (body: unknown): UploadStatusResponse => {
   const record = asRecord(body, "upload status");
   if (typeof record.enabled !== "boolean") throw invalid("upload status");
   return { enabled: record.enabled };
};

/** Validates `GET /upload/config`. */
export const parseUploadConfigResponse = (body: unknown): UploadConfigResponse => {
   const record = asRecord(body, "upload config");
   return {
      localUploadEnabled: booleanField(record, "localUploadEnabled", "upload config"),
      mediaWikiUrl: stringField(record, "mediaWikiUrl", "upload config"),
   };
};

/** Validates `POST /upload/titles-exist`. */
export const parseTitlesExistResponse = (body: unknown): TitlesExistResponse => {
   const record = asRecord(body, "titles-exist");
   return { existing: stringArrayField(record, "existing", "titles-exist") };
};

/** Validates `POST /auth/logout`. */
export const parseAuthLogoutResponse = (body: unknown): AuthLogoutResponse => {
   const record = asRecord(body, "logout");
   if (record.success !== true) throw invalid("logout");
   return { success: true };
};

/** Validates `GET /auth/me` (only the authenticated 2xx body). */
export const parsePublicWikiUser = (body: unknown): PublicWikiUser => {
   const record = asRecord(body, "auth user");
   const user: PublicWikiUser = {
      id: stringField(record, "id", "auth user"),
      username: stringField(record, "username", "auth user"),
   };

   if (record.profile !== undefined) {
      if (!isRecord(record.profile)) throw invalid("auth user");
      user.profile = record.profile;
   }

   const blocked = optionalBoolean(record, "blocked", "auth user");
   if (blocked !== undefined) user.blocked = blocked;

   const blockreason = optionalString(record, "blockreason", "auth user");
   if (blockreason !== undefined) user.blockreason = blockreason;

   return user;
};

/** Validates one user entry from the leaderboard aggregate. */
export const parseWikiLovesUserData = (body: unknown): WikiLovesUserData => {
   const record = asRecord(body, "leaderboard user");
   const user: WikiLovesUserData = {
      count: numberField(record, "count", "leaderboard user"),
      usage: numberField(record, "usage", "leaderboard user"),
      reg: numberField(record, "reg", "leaderboard user"),
   };

   const yearly = parseYearly(record.yearly, "leaderboard user");
   if (yearly) user.yearly = yearly;

   return user;
};

/** Validates `GET /api/leaderboard/user/:name`. */
export const parseUserStats = (body: unknown): UserStats => {
   const record = asRecord(body, "user stats");
   const totals = asRecord(record.total, "user stats");

   const total: UserStats["total"] = {
      count: numberField(totals, "count", "user stats"),
      usage: numberField(totals, "usage", "user stats"),
      reg: numberField(totals, "reg", "user stats"),
   };
   const yearly = parseYearly(totals.yearly, "user stats");
   if (yearly) total.yearly = yearly;

   const stats: UserStats = {
      username: stringField(record, "username", "user stats"),
      total,
      country: stringField(record, "country", "user stats"),
   };

   if (record.commons === null) {
      stats.commons = null;
   } else if (record.commons !== undefined) {
      const commons = asRecord(record.commons, "user stats");
      stats.commons = {
         editcount: numberField(commons, "editcount", "user stats"),
         registration: stringField(commons, "registration", "user stats"),
         groups: stringArrayField(commons, "groups", "user stats"),
         blocked: optionalBoolean(commons, "blocked", "user stats"),
         blockreason: optionalString(commons, "blockreason", "user stats"),
         blockexpiry: optionalString(commons, "blockexpiry", "user stats"),
      };
   }

   return stats;
};
