import { describe, expect, it } from "vitest";
import {
   aggregateLeaderboardYears,
   COUNTRY,
   extractCountry,
   isEventFinished,
} from "@/utils/leaderboard.ts";

/** Minimal country payload shaped like the toolforge `/api/events/monuments<year>` node. */
function countryPayload(overrides: {
   users?: Record<string, { count: number; usage: number; reg: number }>;
   count?: number;
   usage?: number;
   usercount?: number;
}) {
   return {
      category: "Wiki Loves Monuments",
      count: overrides.count ?? 0,
      usage: overrides.usage ?? 0,
      usercount: overrides.usercount ?? 0,
      userreg: 0,
      start: 20130101000000,
      end: 20130901000000,
      data: {},
      users: overrides.users ?? {},
   };
}

describe("aggregateLeaderboardYears", () => {
   it("sums totals across years and records per-year tallies", () => {
      const result = aggregateLeaderboardYears(
         [2013, 2014],
         [
            { Azerbaijan: countryPayload({ count: 10, usage: 20 }) },
            { Azerbaijan: countryPayload({ count: 30, usage: 40 }) },
         ],
      );

      const country = result[COUNTRY];
      expect(country.count).toBe(40);
      expect(country.usage).toBe(60);
      expect(country.years?.[2013]).toEqual({ count: 10, usercount: 0, usage: 20 });
      expect(country.years?.[2014]).toEqual({ count: 30, usercount: 0, usage: 40 });
   });

   it("skips null results (fetch failures) without skewing the sums", () => {
      const result = aggregateLeaderboardYears(
         [2013, 2014],
         [{ Azerbaijan: countryPayload({ count: 10, usage: 20 }) }, null],
      );

      expect(result[COUNTRY].count).toBe(10);
      expect(result[COUNTRY].usage).toBe(20);
      expect(Object.keys(result[COUNTRY].years ?? {}).sort()).toEqual(["2013"]);
   });

   it("skips payloads that lack the Azerbaijan key entirely", () => {
      const result = aggregateLeaderboardYears(
         [2013],
         [{ Germany: countryPayload({ count: 99 }) }],
      );

      expect(result[COUNTRY].count).toBe(0);
   });

   it("merges a user's count/usage and earliest registration across years", () => {
      const result = aggregateLeaderboardYears(
         [2013, 2014],
         [
            {
               Azerbaijan: countryPayload({
                  users: { Alice: { count: 1, usage: 5, reg: 20130801000000 } },
               }),
            },
            {
               Azerbaijan: countryPayload({
                  users: { Alice: { count: 2, usage: 9, reg: 20140801000000 } },
               }),
            },
         ],
      );

      const alice = result[COUNTRY].users["Alice"];
      expect(alice.count).toBe(3);
      expect(alice.usage).toBe(14);
      expect(alice.reg).toBe(20130801000000);
      expect(alice.yearly).toEqual({
         2013: { count: 1, usage: 5 },
         2014: { count: 2, usage: 9 },
      });
   });

   it("counts unique users across years", () => {
      const result = aggregateLeaderboardYears(
         [2013, 2014],
         [
            { Azerbaijan: countryPayload({ users: { Alice: { count: 1, usage: 1, reg: 1 } } }) },
            {
               Azerbaijan: countryPayload({
                  users: {
                     Alice: { count: 1, usage: 1, reg: 1 },
                     Bob: { count: 1, usage: 1, reg: 1 },
                  },
               }),
            },
         ],
      );

      expect(result[COUNTRY].usercount).toBe(2);
   });

   it("never creates polluted objects from hostile username keys", () => {
      const hostileUsers: Record<string, { count: number; usage: number; reg: number }> = {
         __proto__: { count: 99, usage: 99, reg: 1 },
         constructor: { count: 99, usage: 99, reg: 1 },
         prototype: { count: 99, usage: 99, reg: 1 },
      };
      const result = aggregateLeaderboardYears(
         [2013],
         [{ Azerbaijan: countryPayload({ users: hostileUsers }) }],
      );

      expect(result[COUNTRY].users["__proto__"]).toBeUndefined();
      expect(result[COUNTRY].users["constructor"]).toBeUndefined();
      expect(result[COUNTRY].users["prototype"]).toBeUndefined();
      expect(result[COUNTRY].count).toBe(0);
   });

   it("aggregates sliced payloads exactly like full ones", () => {
      const users = { Alice: { count: 3, usage: 4, reg: 20130101000000 } };
      const full = {
         Azerbaijan: countryPayload({ users, count: 7, usage: 9, usercount: 1 }),
         Albania: countryPayload({ users, count: 999, usage: 999, usercount: 99 }),
      };

      const fromFull = aggregateLeaderboardYears([2013], [full]);
      const fromSlice = aggregateLeaderboardYears([2013], [extractCountry(full)]);

      expect(fromSlice).toEqual(fromFull);
   });
});

describe("extractCountry", () => {
   it("keeps only the country we serve", () => {
      const payload = {
         Azerbaijan: countryPayload({ count: 5 }),
         Albania: countryPayload({ count: 999 }),
         Angola: countryPayload({ count: 999 }),
      };

      const result = extractCountry(payload);

      expect(Object.keys(result!)).toEqual([COUNTRY]);
      expect(result![COUNTRY].count).toBe(5);
   });

   it("does not mutate the payload it was given", () => {
      const payload = {
         Azerbaijan: countryPayload({ count: 5 }),
         Albania: countryPayload({}),
      };
      const before = Object.keys(payload);

      extractCountry(payload);

      expect(Object.keys(payload)).toEqual(before);
   });

   it("returns null when the country is missing, so callers can 404", () => {
      expect(extractCountry({ Albania: countryPayload({}) })).toBeNull();
      expect(extractCountry({ [COUNTRY]: null })).toBeNull();
      expect(extractCountry({ [COUNTRY]: "nope" })).toBeNull();
   });

   it("returns null for values that are not payloads at all", () => {
      expect(extractCountry(null)).toBeNull();
      expect(extractCountry(undefined)).toBeNull();
      expect(extractCountry("Azerbaijan")).toBeNull();
      expect(extractCountry(42)).toBeNull();
   });
});

describe("isEventFinished", () => {
   const now = new Date("2026-09-29T12:00:00Z");

   it("treats a past contest as finished", () => {
      expect(isEventFinished(20130930185959, now)).toBe(true);
      expect(isEventFinished(20260831200000, now)).toBe(true);
   });

   it("treats a running or future contest as live", () => {
      expect(isEventFinished(20261001195959, now)).toBe(false);
      expect(isEventFinished(20301001195959, now)).toBe(false);
   });

   it("treats a contest ending today as still live", () => {
      // The end stamp is a local contest time, so the day is only over once
      // it is actually behind us — a same-day stamp must not be cached long.
      expect(isEventFinished(20260929235959, now)).toBe(false);
   });

   it("falls back to the live TTL for unusable stamps", () => {
      expect(isEventFinished(undefined, now)).toBe(false);
      expect(isEventFinished(0, now)).toBe(false);
      expect(isEventFinished(-1, now)).toBe(false);
      expect(isEventFinished(NaN, now)).toBe(false);
      expect(isEventFinished("20130930185959", now)).toBe(false);
      expect(isEventFinished(2013093.5, now)).toBe(false);
   });

   it("reads the date off a stamp that carries a fractional part", () => {
      expect(isEventFinished(20130930185959.7, now)).toBe(true);
   });
});
