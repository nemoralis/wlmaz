import { describe, expect, it } from "vitest";
import { isValidWikiUsername } from "@/utils/username.ts";

describe("isValidWikiUsername", () => {
   it("accepts real Unicode Wikimedia usernames", () => {
      expect(isValidWikiUsername("Rəcəb Yaxşı")).toBe(true);
      expect(isValidWikiUsername("Dinarə Ramazanlı")).toBe(true);
      expect(isValidWikiUsername("Babək Akifoğlu")).toBe(true);
      expect(isValidWikiUsername("Vətəndaş Ağ saqqal")).toBe(true);
   });

   it("accepts the punctuation used by existing Commons accounts", () => {
      expect(isValidWikiUsername("Behruz~commonswiki")).toBe(true);
      expect(isValidWikiUsername("Nurıde23")).toBe(true);
      expect(isValidWikiUsername("Space User")).toBe(true);
      expect(isValidWikiUsername("Underscore_User")).toBe(true);
      expect(isValidWikiUsername("Dot.Name")).toBe(true);
      expect(isValidWikiUsername("Hyphen-Name")).toBe(true);
      expect(isValidWikiUsername("O'Brien")).toBe(true);
   });

   it("rejects empty, oversized, and padded names", () => {
      expect(isValidWikiUsername("")).toBe(false);
      expect(isValidWikiUsername("a".repeat(256))).toBe(false);
      expect(isValidWikiUsername(" User")).toBe(false);
      expect(isValidWikiUsername("User ")).toBe(false);
      expect(isValidWikiUsername(null)).toBe(false);
      expect(isValidWikiUsername(42)).toBe(false);
   });

   it("rejects controls and URL/MediaWiki delimiters", () => {
      expect(isValidWikiUsername("User\n")).toBe(false);
      expect(isValidWikiUsername("User|Admin")).toBe(false);
      expect(isValidWikiUsername("User=1")).toBe(false);
      expect(isValidWikiUsername("User/Name")).toBe(false);
      expect(isValidWikiUsername("User#fragment")).toBe(false);
      expect(isValidWikiUsername("User?x=1")).toBe(false);
      expect(isValidWikiUsername("User%20Name")).toBe(false);
      expect(isValidWikiUsername("[bad]")).toBe(false);
      expect(isValidWikiUsername("<script>")).toBe(false);
   });
});
