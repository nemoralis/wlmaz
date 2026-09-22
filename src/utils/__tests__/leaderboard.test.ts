import { describe, expect, it } from "vitest";
import { aggregateLeaderboardYears, COUNTRY } from "@/utils/leaderboard.ts";

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
});
