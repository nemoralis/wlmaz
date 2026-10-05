/**
 * Policy-shape assertions for the /privacy statement.
 *
 * The WMCS Terms of Use §7.3.2 enumerate what a Privacy Statement must
 * contain. This project collects Wikimedia Usernames through OAuth, so §7.3.2
 * applies in full. Nothing here checks legal adequacy — it only makes sure that
 * a later content pass cannot quietly drop one of the enumerated elements, which
 * is how this finding arose in the first place.
 *
 * Read from disk as well as imported, because the guarantee that matters is that
 * the policy documents are *reachable*: a link that only exists in an unused
 * constant satisfies an import-level assertion but not the policy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
   PRIVACY_ACCESS,
   PRIVACY_ADMIN,
   PRIVACY_CANONICAL,
   PRIVACY_COLLECT_HEADING,
   PRIVACY_CONTACT,
   PRIVACY_DATA_TABLE,
   PRIVACY_DESCRIPTION,
   PRIVACY_DISCLAIMER,
   PRIVACY_FOOTER_LINKS,
   PRIVACY_INTRO,
   PRIVACY_POLICY_LINK_LABELS,
   PRIVACY_POLICY_LINKS,
   PRIVACY_REQUIREMENTS,
   PRIVACY_SECURITY,
   PRIVACY_TABLE_HEADERS,
   PRIVACY_TITLE,
   PRIVACY_TRANSFER,
   PRIVACY_USERNAMES,
} from "@/content/privacy.ts";
import { SITE_HOST } from "@/utils/constants.ts";

/** Repo root, resolved from this file rather than process.cwd(). */
const ROOT = path.resolve(import.meta.dirname, "../../..");

const readRootFile = (name: string): string => readFileSync(path.join(ROOT, name), "utf-8");

describe("privacy statement head", () => {
   it("uses the same title format the prerender writes for static pages", () => {
      // scripts/prerender.ts builds `${pageTitle} | ${SITE_TITLE}`; anything else
      // means the runtime head rewrites the title after hydration.
      expect(PRIVACY_TITLE).toBe(`Məxfilik Bəyannaməsi | Viki Abidələri Sevir Azərbaycan`);
      expect(PRIVACY_TITLE.endsWith("| Viki Abidələri Sevir Azərbaycan")).toBe(true);
   });

   it("canonicalizes to the /privacy route", () => {
      expect(PRIVACY_CANONICAL).toBe(`${SITE_HOST}/privacy`);
   });

   it("has a non-empty description to prerender", () => {
      expect(PRIVACY_DESCRIPTION.length).toBeGreaterThan(50);
   });
});

describe("§7.3.2 required content", () => {
   it("satisfies every enumerated element in PRIVACY_REQUIREMENTS", () => {
      // Guards the mapping itself: dropping an entry would not fail any other
      // assertion here, so the list is asserted to stay non-trivial.
      expect(PRIVACY_REQUIREMENTS.length).toBeGreaterThanOrEqual(9);
      for (const requirement of PRIVACY_REQUIREMENTS) {
         expect(requirement.element.length).toBeGreaterThan(0);
         expect(requirement.section).toMatch(/^§\d/);
      }
   });

   it("states a storage duration for every category of Personal Information", () => {
      expect(PRIVACY_DATA_TABLE.length).toBeGreaterThan(0);
      for (const row of PRIVACY_DATA_TABLE) {
         for (const field of [row.type, row.use, row.retention]) {
            expect(field.en.length).toBeGreaterThan(0);
            expect(field.az.length).toBeGreaterThan(0);
         }
      }
   });

   it("names both languages for every section, since §11 makes English authoritative", () => {
      const bilingual: Array<{ en: string; az: string }> = [
         PRIVACY_DISCLAIMER,
         PRIVACY_TRANSFER,
         PRIVACY_ADMIN,
         ...PRIVACY_USERNAMES,
      ];
      for (const pair of bilingual) {
         expect(pair.en.length).toBeGreaterThan(40);
         expect(pair.az.length).toBeGreaterThan(40);
      }
   });

   it("describes security measures rather than merely promising security", () => {
      expect(PRIVACY_SECURITY.measures.length).toBeGreaterThanOrEqual(3);
      for (const measure of PRIVACY_SECURITY.measures) {
         expect(measure.en.length).toBeGreaterThan(30);
      }
   });

   it("keeps the closing disclaimer verbatim from the policy template", () => {
      // §7.3.2 requires this text to appear; paraphrasing it is the usual way
      // the requirement gets lost, so assert on the phrases it must contain.
      for (const phrase of [
         "hosted and operated in the United States",
         "less stringent data protection laws",
         "this Privacy Statement, rather than the Wikimedia Foundation's Privacy Policy",
      ]) {
         expect(PRIVACY_DISCLAIMER.en).toContain(phrase);
      }
   });

   it("discloses that a Wikimedia Username is Personal Information", () => {
      const copy = PRIVACY_USERNAMES.map((item) => item.en).join(" ");
      expect(copy).toContain("Wikimedia username");
      expect(copy).toMatch(/Personal Information/);
   });

   it("says the administrators are bound by the administrators' Terms", () => {
      expect(PRIVACY_ADMIN.en).toContain(
         "Wikimedia Cloud Services Terms of Use for Administrators and Developers",
      );
      // §7.3.2 also requires that the statement link the document it names.
      expect(PRIVACY_POLICY_LINKS.adminTerms).toMatch(/^https:\/\/wikitech\.wikimedia\.org\//);
   });
});

describe("policy document links", () => {
   it("points the End User Terms at the canonical page", () => {
      expect(PRIVACY_POLICY_LINKS.endUserTerms).toBe(
         "https://wikitech.wikimedia.org/wiki/Cloud_Services_End_User_Terms_of_use",
      );
   });

   it("uses canonical wikitech.wikimedia.org hosts for every policy link", () => {
      const hrefs = Object.values(PRIVACY_POLICY_LINKS).filter((value) => value.startsWith("http"));
      expect(hrefs.length).toBeGreaterThanOrEqual(3);
      for (const href of hrefs) {
         expect(href).toMatch(/^https:\/\/(wikitech|foundation)\.wikimedia\.org\//);
      }
   });

   it("labels every policy link in both languages", () => {
      // The statement names each document in prose and links it; a link whose
      // label does not match the document it opens is not usable by a reader.
      for (const key of ["adminTerms", "endUserTerms", "wmfPrivacy"] as const) {
         const label = PRIVACY_POLICY_LINK_LABELS[key];
         expect(label.en.length, key).toBeGreaterThan(10);
         expect(label.az.length, key).toBeGreaterThan(10);
         // The WMF policy is explicitly *not* the governing document, and the
         // label has to say so — §7.3.2 requires that distinction to be clear.
         if (key === "wmfPrivacy") {
            expect(label.en).toMatch(/rather|not/);
            expect(label.az).toMatch(/deyil/);
         }
      }
   });
});

describe("Azerbaijani terminology", () => {
   it("uses the approved wording for the statement's own name", () => {
      // "Məxfilik Bəyannaməsi" is the project's chosen term; the earlier draft
      // used "Məxbuliyyət". Asserting the absence of the old form is the only
      // thing that catches a regression, since nothing else imports the strings.
      const source = readRootFile(path.join("src", "content", "privacy.ts"));
      expect(source).not.toContain("Məxbuliyyət");
      expect(PRIVACY_TITLE).toContain("Məxfilik Bəyannaməsi");
      expect(PRIVACY_COLLECT_HEADING.az).toBe("Nəyi toplayırıq");
   });

   it("translates the Foundation and developers as the project writes them", () => {
      const az = [
         PRIVACY_DISCLAIMER.az,
         PRIVACY_TRANSFER.az,
         PRIVACY_POLICY_LINK_LABELS.adminTerms.az,
         PRIVACY_POLICY_LINK_LABELS.endUserTerms.az,
      ].join(" ");
      expect(az).toContain("Vikimedia Fondu");
      expect(az).toContain("tərtibatçılar");
      // "Vəqfiv" and "developer" are the English-influenced forms this replaced.
      expect(az).not.toMatch(/Vəqfiv/);
      expect(az).not.toMatch(/developer/i);
   });

   it("keeps the Foundation's own name out of the Azerbaijani Foundation word", () => {
      // "Vikimedia Fondunun Məxfilik Siyasəti" is the policy's title; the data-flow
      // wording must not drift back to "Wikimediya Vəqfivi …" for it.
      expect(PRIVACY_POLICY_LINK_LABELS.wmfPrivacy.az).toContain("Vikimedia Fondunun");
   });

   it("headings and table headers are translated in both languages", () => {
      // Every section heading is bilingual; the table's column headings too, so
      // the two renderings of the statement have the same structure.
      for (const pair of [
         PRIVACY_COLLECT_HEADING,
         PRIVACY_TABLE_HEADERS.caption,
         PRIVACY_TABLE_HEADERS.type,
         PRIVACY_TABLE_HEADERS.use,
         PRIVACY_TABLE_HEADERS.retention,
         PRIVACY_POLICY_LINK_LABELS.adminTerms,
      ]) {
         expect(pair.en.length, "en").toBeGreaterThan(0);
         expect(pair.az.length, "az").toBeGreaterThan(0);
      }
      expect(PRIVACY_COLLECT_HEADING.en).toBe("What we collect");
      expect(PRIVACY_TABLE_HEADERS.type.az).toBe("Məlumat");
   });
});

// ---------------------------------------------------------------------------
// ASD-STE100 Simplified Technical English, applied to the English copy.
//
// The Terms require the closing disclaimer verbatim, so PRIVACY_DISCLAIMER is
// excluded from the sentence-length rule below and asserted byte-exact
// instead. Its long sentences are mandated text, not a style regression.
// ---------------------------------------------------------------------------

/** Sentence splitter: splits on . ! ? followed by whitespace or end of string. */
const sentences = (text: string): string[] =>
   (text.match(/[^.!?]+[.!?]+/g) ?? [text])
      .map((s) => s.trim())
      .filter(Boolean);

const words = (text: string): number => text.trim().split(/\s+/).length;

/** Every English string that renders on /privacy, paired with a label. */
const englishCopy = (): [label: string, text: string][] => [
   ["intro.administeredBy", PRIVACY_INTRO.administeredBy.en],
   ["collect heading", PRIVACY_COLLECT_HEADING.en],
   ["table caption", PRIVACY_TABLE_HEADERS.caption.en],
   ...PRIVACY_DATA_TABLE.flatMap(
      (row, i): [string, string][] => [
         [`row ${i + 1} type`, row.type.en],
         [`row ${i + 1} use`, row.use.en],
         [`row ${i + 1} retention`, row.retention.en],
      ],
   ),
   ["security intro", PRIVACY_SECURITY.intro.en],
   ...PRIVACY_SECURITY.measures.map((m, i) => [`security measure ${i + 1}`, m.en] as [string, string]),
   ["access", PRIVACY_ACCESS.en],
   ...PRIVACY_USERNAMES.map((u, i) => [`username ${i + 1}`, u.en] as [string, string]),
   ["admin", PRIVACY_ADMIN.en],
   ["transfer", PRIVACY_TRANSFER.en],
   ["contact", PRIVACY_CONTACT.en],
];

describe("ASD-STE100 Simplified Technical English", () => {
   it("keeps every sentence at or under 20 words", () => {
      // Part 2: a sentence states one instruction or one idea. Anything over 20
      // words has to be split — this is the rule that produced most of the
      // rewrite, so it is the one worth guarding.
      const overlong = englishCopy().flatMap(([label, text]) =>
         sentences(text)
            .map((s) => [label, s, words(s)] as const)
            .filter(([, , count]) => count > 20),
      );
      expect(
         overlong.map(([label, s, count]) => `${label} (${count}w): ${s}`),
      ).toEqual([]);
   });

   it("states one idea per sentence", () => {
      // Part 2 forbids conjoining unrelated clauses with "and"/"also" in a
      // single sentence. The permitted case is a genuine pair of related facts
      // ("... your uploads to you and ... your profile page"), so this only
      // rejects sentences that stack three or more clauses.
      for (const [label, text] of englishCopy()) {
         for (const sentence of sentences(text)) {
            const clauses = (sentence.match(/\b(?:and|or)\b/gi) ?? []).length;
            expect(clauses, `${label}: ${sentence}`).toBeLessThanOrEqual(1);
         }
      }
   });

   it("uses no em dashes or other unapproved punctuation", () => {
      // Part 1 treats the em dash as outside the approved punctuation set. It
      // was the main offender in the previous draft's retention cells.
      for (const [label, text] of englishCopy()) {
         expect(text, label).not.toMatch(/[—–]/);
      }
   });

   it("keeps the whole English statement short", () => {
      // The previous draft was 708 words. The Terms mandate eight elements; they
      // do not mandate a word count, so this ceiling is what stops the document
      // drifting back into an unreadable wall of prose. Set above the current
      // total with room for one content addition, not at it.
      const total = englishCopy().reduce((sum, [, text]) => sum + words(text), 0);
      expect(total).toBeLessThanOrEqual(600);
   });

   it("keeps the mandated closing disclaimer verbatim", () => {
      // §7.3.2 element 8 quotes the required text. We ship it byte-exact rather
      // than simplified, so this is the guarantee that the quote is intact.
      expect(PRIVACY_DISCLAIMER.en).toBe(
         "WMCS is hosted and operated in the United States. By using Wiki Loves Monuments Azerbaijan, you acknowledge and understand that collection, use, storage, and other processing of your information (personal or otherwise) as outlined in this Privacy Statement will take place in the United States. You understand that your information also may be transferred to other countries, and that the United States and such other countries may have different or less stringent data protection laws than your country. Furthermore, you acknowledge that your Personal Information will be governed by this Privacy Statement, rather than the Wikimedia Foundation's Privacy Policy.",
      );
      // And the two disclosures it duplicates are still present in their own right.
      expect(PRIVACY_TRANSFER.en).toContain("United States");
      expect(PRIVACY_TRANSFER.en).toMatch(/other countries/);
   });

   it("does not apply a Part 1 vocabulary claim it cannot verify", () => {
      // The official Part 1 word list is not vendored, so no test asserts
      // membership. This records the limit so a future pass does not mistake
      // "no vocabulary test" for "vocabulary verified".
      const source = readRootFile(path.join("src", "content", "privacy.ts"));
      expect(source).toContain("STE has no vocabulary for");
      expect(source).toContain("PRIVACY_DISCLAIMER");
   });
});

describe("contact address", () => {
   it("is named exactly once in each contact sentence", () => {
      // PrivacyPage.vue splits the sentence on the address to render it as a
      // mailto: link. A second occurrence would silently drop everything after
      // the first, and a missing one would leave the address unlinked.
      const address = PRIVACY_POLICY_LINKS.reportEmail;
      for (const text of [PRIVACY_CONTACT.en, PRIVACY_CONTACT.az]) {
         expect(text.split(address), text).toHaveLength(2);
      }
   });

   it("splits into a non-empty prefix and suffix in both languages", () => {
      const address = PRIVACY_POLICY_LINKS.reportEmail;
      for (const text of [PRIVACY_CONTACT.en, PRIVACY_CONTACT.az]) {
         const [before, after] = text.split(address);
         expect(before.length).toBeGreaterThan(40);
         // English ends on the address itself ("...and contact privacy@…"),
         // Azerbaijani continues ("… ünvanı ilə əlaqə saxlayın."), so only a
         // non-empty remainder is guaranteed — not a length.
         expect(after.length).toBeGreaterThan(0);
         // The split must be lossless, or the page drops part of the sentence.
         expect(`${before}${address}${after}`).toBe(text);
         expect(after.endsWith(".")).toBe(true);
      }
   });
});

describe("footer policy links", () => {
   it("links the Privacy Statement from the shell, not from a single page", () => {
      // §7.3.1 / §9.1. Rendered by src/App.vue, which is outside <main>, so the
      // link is on every page including the homepage the clause names.
      const privacy = PRIVACY_FOOTER_LINKS.find((link) => link.to === "/privacy");
      expect(privacy).toBeDefined();
      expect(privacy?.external).toBe(false);
   });

   it("links the End User Terms of Use from the shell too", () => {
      const endUser = PRIVACY_FOOTER_LINKS.find(
         (link) => link.to === PRIVACY_POLICY_LINKS.endUserTerms,
      );
      expect(endUser).toBeDefined();
      expect(endUser?.external).toBe(true);
   });

   it("gives every footer link an Azerbaijani and an English label", () => {
      // §7.3.2 requires the statement be available in English; an unreadable
      // label would defeat that for the site's primary audience.
      for (const link of PRIVACY_FOOTER_LINKS) {
         expect(link.label.length).toBeGreaterThan(0);
         expect(link.labelEn.length).toBeGreaterThan(0);
      }
   });
});

describe("reachability", () => {
   it("registers /privacy as a route", async () => {
      const routesSource = readRootFile(path.join("src", "routes", "index.ts"));
      expect(routesSource).toContain('path: "/privacy"');
      expect(routesSource).toContain("pages/PrivacyPage.vue");
   });

   it("renders the exported sections from the Vue page, so none are unused", () => {
      // Guards against the copy drifting into content/privacy.ts with no
      // template reference — every exported block must actually be bound.
      const page = readRootFile(path.join("src", "pages", "PrivacyPage.vue"));
      for (const symbol of [
         "PRIVACY_DATA_TABLE",
         "PRIVACY_SECURITY",
         "PRIVACY_ACCESS",
         "PRIVACY_USERNAMES",
         "PRIVACY_ADMIN",
         "PRIVACY_TRANSFER",
         "PRIVACY_DISCLAIMER",
         "PRIVACY_CONTACT",
         "PRIVACY_POLICY_LINKS",
      ]) {
         expect(page, symbol).toContain(symbol);
      }
   });

   it("is linked from the app shell", () => {
      const app = readRootFile(path.join("src", "App.vue"));
      expect(app).toContain("PRIVACY_FOOTER_LINKS");
      expect(app).toContain("<footer");
   });

   it("is prerendered, served by the Express static list, and verified", () => {
      // Otherwise the policy text would be reachable only with JavaScript
      // enabled, and the build would not check the head it ships.
      const prerender = readRootFile(path.join("scripts", "prerender.ts"));
      expect(prerender).toContain('route: "/privacy"');

      const server = readRootFile(path.join("src", "index.ts"));
      expect(server).toContain('"/privacy": "privacy.html"');

      const verify = readRootFile(path.join("scripts", "verify-prerender.ts"));
      expect(verify).toContain('"/privacy"');
      expect(verify).toContain("checkPrivacyHead");
   });
});
