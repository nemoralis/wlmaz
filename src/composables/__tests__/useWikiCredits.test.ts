import { afterEach, describe, expect, it, vi } from "vitest";

/** A Commons imageinfo response carrying just the fields the composable reads. */
const creditReply = (author: string) =>
   new Response(
      JSON.stringify({
         query: {
            pages: [
               {
                  imageinfo: [
                     {
                        extmetadata: {
                           Artist: { value: author },
                           LicenseShortName: { value: "CC BY-SA 4.0" },
                        },
                     },
                  ],
               },
            ],
         },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
   );

const fileUrl = (name: string) =>
   `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`;

/** The credit cache lives at module scope, so every test imports a fresh module. */
const freshComposables = async () => {
   vi.resetModules();
   return import("@/composables/useWikiCredits.ts");
};

/** Defers only the named file, letting the test control response ordering. */
const gatedFetch = (slowName: string, slowAuthor: string, fastAuthor: string) => {
   let release!: () => void;
   const gate = new Promise<void>((resolve) => {
      release = resolve;
   });

   const spy = vi.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(String(input));
      if (url.includes(slowName)) {
         await gate;
         return creditReply(slowAuthor);
      }
      return creditReply(fastAuthor);
   });

   vi.stubGlobal("fetch", spy);
   return { release };
};

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("useWikiCredits", () => {
   it("ignores a slow credit response after another image is selected", async () => {
      const { release } = gatedFetch("Slow.jpg", "Slow Author", "Fast Author");
      const { useWikiCredits } = await freshComposables();
      const credits = useWikiCredits();

      const slow = credits.fetchImageMetadata(fileUrl("Slow.jpg"));
      await credits.fetchImageMetadata(fileUrl("Fast.jpg"));

      expect(credits.imageCredit.value?.author).toBe("Fast Author");
      expect(credits.creditLoading.value).toBe(false);

      release();
      await slow;

      // The old request must not relabel the image currently on screen.
      expect(credits.imageCredit.value?.author).toBe("Fast Author");
      expect(credits.creditLoading.value).toBe(false);
   });

   it("clears the credit without letting an in-flight request restore it", async () => {
      const { release } = gatedFetch("Slow.jpg", "Slow Author", "Fast Author");
      const { useWikiCredits } = await freshComposables();
      const credits = useWikiCredits();

      const pending = credits.fetchImageMetadata(fileUrl("Slow.jpg"));
      expect(credits.creditLoading.value).toBe(true);

      // Selecting "no image" (monument without a photo) invalidates the request.
      await credits.fetchImageMetadata("");
      expect(credits.imageCredit.value).toBeNull();
      expect(credits.creditLoading.value).toBe(false);

      release();
      await pending;

      expect(credits.imageCredit.value).toBeNull();
      expect(credits.creditLoading.value).toBe(false);
   });
});
