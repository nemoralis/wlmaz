import { afterEach, describe, expect, it, vi } from "vitest";
import { SPARQLQueryDispatcher } from "../sparqlClient";

const PAYLOAD = { results: { bindings: [] } };
const encoder = new TextEncoder();

/** A fetch-Response stub streaming `text` through `body.getReader()`. */
const streamResponse = (
   text: string,
   headers: Record<string, string> = {},
   chunkCount = 1,
): {
   ok: boolean;
   statusText?: string;
   headers: { get: (name: string) => string | null };
   body: { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }> } };
} => {
   const encoded = encoder.encode(text);
   const chunkSize = Math.ceil(encoded.byteLength / chunkCount);
   let offset = 0;

   return {
      ok: true,
      headers: { get: (name) => headers[name.toLowerCase()] ?? null },
      body: {
         getReader: () => ({
            read: async () => {
               if (offset >= encoded.byteLength) {
                  return { done: true };
               }
               const value = encoded.slice(offset, offset + chunkSize);
               offset += value.byteLength;
               return { done: false, value };
            },
         }),
      },
   };
};

const okResponse = (payload: unknown = PAYLOAD, headers: Record<string, string> = {}) =>
   streamResponse(JSON.stringify(payload), headers);

afterEach(() => {
   vi.unstubAllGlobals();
   vi.useRealTimers();
   vi.restoreAllMocks();
});

describe("SPARQLQueryDispatcher", () => {
   it("URL-encodes the query, sends the SPARQL Accept header and resolves the JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue(okResponse());
      vi.stubGlobal("fetch", fetchMock);

      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql");
      const result = await dispatcher.query("SELECT * WHERE { ?s ?p ?o }");

      expect(result).toEqual(PAYLOAD);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
         `https://example.org/sparql?query=${encodeURIComponent("SELECT * WHERE { ?s ?p ?o }")}`,
      );
      expect(init.headers.Accept).toBe("application/sparql-results+json");
      expect(init.headers["User-Agent"]).toContain("WLMAZ-Updater");
      // Progress counts raw bytes, so the body must arrive uncompressed.
      expect(init.headers["Accept-Encoding"]).toBe("identity");
   });

   it("throws on a non-2xx response without retrying", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false, statusText: "Bad Gateway" });
      vi.stubGlobal("fetch", fetchMock);

      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql");
      await expect(dispatcher.query("SELECT 1")).rejects.toThrow(
         "Failed to fetch data: Bad Gateway",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
   });

   it("reports cumulative byte progress, with a null total when the size is unknown", async () => {
      const body = JSON.stringify(PAYLOAD);
      const fetchMock = vi.fn().mockResolvedValue(streamResponse(body, {}, 3));
      vi.stubGlobal("fetch", fetchMock);

      const progress: Array<[number, number | null]> = [];
      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql");
      const result = await dispatcher.query("SELECT 1", (loaded, total) =>
         progress.push([loaded, total]),
      );

      expect(result).toEqual(PAYLOAD);
      // Initial 0 tick, then one cumulative report per chunk.
      expect(progress[0]).toEqual([0, null]);
      expect(progress.map(([loaded]) => loaded)).toEqual(
         progress
            .map(([loaded]) => loaded)
            .slice()
            .sort((a, b) => a - b),
      );
      expect(progress.at(-1)).toEqual([byteLength(body), null]);
   });

   it("reports the declared total when Content-Length is present", async () => {
      const body = JSON.stringify(PAYLOAD);
      const fetchMock = vi
         .fn()
         .mockResolvedValue(okResponse(PAYLOAD, { "content-length": String(body.length) }));
      vi.stubGlobal("fetch", fetchMock);

      const progress: Array<[number, number | null]> = [];
      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql");
      await dispatcher.query("SELECT 1", (loaded, total) => progress.push([loaded, total]));

      expect(progress).toEqual([
         [0, body.length],
         [byteLength(body), body.length],
      ]);
   });

   it("retries a corrupted response body and returns the next attempt", async () => {
      vi.useFakeTimers();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const fetchMock = vi
         .fn()
         .mockResolvedValueOnce(streamResponse("{ not json"))
         .mockResolvedValueOnce(okResponse());
      vi.stubGlobal("fetch", fetchMock);

      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql");
      const pending = dispatcher.query("SELECT 1");
      await vi.runAllTimersAsync();

      await expect(pending).resolves.toEqual(PAYLOAD);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledWith("Response corrupted on attempt 1/3, retrying...");
   });

   it("gives up after maxRetries corrupted responses", async () => {
      vi.useFakeTimers();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      const fetchMock = vi
         .fn()
         .mockImplementation(() => Promise.resolve(streamResponse("{ not json")));
      vi.stubGlobal("fetch", fetchMock);

      const dispatcher = new SPARQLQueryDispatcher("https://example.org/sparql", 2);
      const pending = dispatcher.query("SELECT 1");
      const outcome = expect(pending).rejects.toThrow();
      await vi.runAllTimersAsync();
      await outcome;

      expect(fetchMock).toHaveBeenCalledTimes(2);
   });
});

/** UTF-8 byte length of a string, matching what the reader counts. */
function byteLength(text: string): number {
   return encoder.encode(text).byteLength;
}
