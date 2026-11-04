import { describe, expect, it } from "vitest";
import {
   parseAuthLogoutResponse,
   parsePublicWikiUser,
   parseTitlesExistResponse,
   parseUploadConfigResponse,
   parseUploadStatusResponse,
   parseUserStats,
   parseWikiLovesUserData,
} from "@/utils/apiGuards.ts";

describe("upload response guards", () => {
   it("accepts the upload status and config contracts", () => {
      expect(parseUploadStatusResponse({ enabled: true, extra: "ignored" })).toEqual({
         enabled: true,
      });
      expect(
         parseUploadConfigResponse({
            localUploadEnabled: false,
            mediaWikiUrl: "https://commons.wikimedia.org",
         }),
      ).toEqual({
         localUploadEnabled: false,
         mediaWikiUrl: "https://commons.wikimedia.org",
      });
   });

   it("rejects wrong upload status/config shapes", () => {
      expect(() => parseUploadStatusResponse({ enabled: "yes" })).toThrow(TypeError);
      expect(() => parseUploadStatusResponse(null)).toThrow(TypeError);
      expect(() =>
         parseUploadConfigResponse({ localUploadEnabled: true, mediaWikiUrl: 42 }),
      ).toThrow(TypeError);
   });

   it("accepts only string arrays from titles-exist", () => {
      expect(parseTitlesExistResponse({ existing: ["A.jpg", "B.jpg"] })).toEqual({
         existing: ["A.jpg", "B.jpg"],
      });
      expect(() => parseTitlesExistResponse({ existing: ["A.jpg", 7] })).toThrow(TypeError);
      expect(() => parseTitlesExistResponse({ existing: "A.jpg" })).toThrow(TypeError);
   });
});

describe("auth response guards", () => {
   it("keeps only the public user fields", () => {
      const user = parsePublicWikiUser({
         id: "42",
         username: "Tester",
         profile: { editcount: 10 },
         blocked: false,
         blockreason: "ignored when not blocked",
         token: "secret",
         tokenSecret: "secret",
      });

      expect(user).toEqual({
         id: "42",
         username: "Tester",
         profile: { editcount: 10 },
         blocked: false,
         blockreason: "ignored when not blocked",
      });
      expect(user).not.toHaveProperty("token");
      expect(user).not.toHaveProperty("tokenSecret");
   });

   it("rejects a user without id or username", () => {
      expect(() => parsePublicWikiUser({ username: "Tester" })).toThrow(TypeError);
      expect(() => parsePublicWikiUser({ id: "42" })).toThrow(TypeError);
   });

   it("requires a successful logout acknowledgement", () => {
      expect(parseAuthLogoutResponse({ success: true })).toEqual({ success: true });
      expect(() => parseAuthLogoutResponse({ success: false })).toThrow(TypeError);
      expect(() => parseAuthLogoutResponse({})).toThrow(TypeError);
   });
});

describe("user stats guard", () => {
   const totals = { count: 5, usage: 3, reg: 20200102030405 };

   it("accepts totals, yearly data and a nullable Commons block", () => {
      expect(
         parseUserStats({
            username: "Tester",
            total: { ...totals, yearly: { 2025: { count: 4, usage: 2 } } },
            commons: {
               editcount: 10,
               registration: "2020-01-02T03:04:05Z",
               groups: ["*", "user"],
               blocked: true,
               blockreason: "Spam",
            },
            country: "Azerbaijan",
         }),
      ).toEqual({
         username: "Tester",
         total: { ...totals, yearly: { 2025: { count: 4, usage: 2 } } },
         commons: {
            editcount: 10,
            registration: "2020-01-02T03:04:05Z",
            groups: ["*", "user"],
            blocked: true,
            blockreason: "Spam",
         },
         country: "Azerbaijan",
      });

      expect(
         parseUserStats({
            username: "Tester",
            total: totals,
            commons: null,
            country: "Azerbaijan",
         }).commons,
      ).toBeNull();
   });

   it("rejects malformed totals, yearly maps and Commons records", () => {
      expect(() =>
         parseUserStats({
            username: "Tester",
            total: { ...totals, count: "5" },
            country: "Azerbaijan",
         }),
      ).toThrow(TypeError);

      expect(() =>
         parseUserStats({
            username: "Tester",
            total: { ...totals, yearly: { twenty: { count: 1, usage: 1 } } },
            country: "Azerbaijan",
         }),
      ).toThrow(TypeError);

      expect(() =>
         parseUserStats({
            username: "Tester",
            total: totals,
            commons: { editcount: 1, registration: "x", groups: [1] },
            country: "Azerbaijan",
         }),
      ).toThrow(TypeError);
   });

   it("validates individual leaderboard user records", () => {
      expect(
         parseWikiLovesUserData({ ...totals, yearly: { 2024: { count: 1, usage: 2 } } }),
      ).toEqual({ ...totals, yearly: { 2024: { count: 1, usage: 2 } } });
      expect(() => parseWikiLovesUserData({ ...totals, reg: "old" })).toThrow(TypeError);
   });
});
