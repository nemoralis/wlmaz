import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isHeicFile, uploadSingleFile, type FileItem } from "@/utils/uploadService.ts";

/**
 * Tests for the upload HTTP service: single-file upload with auto-retry on
 * transient failures, cancellation, and HEIC detection. fetch() is stubbed
 * so no network calls occur.
 */

const makeFile = (name = "monument.jpg", type = "image/jpeg"): File =>
   new File(["fake-image-bytes"], name, { type });

const makeFileItem = (overrides: Partial<FileItem> = {}): FileItem => ({
   id: "1",
   file: makeFile(),
   preview: "blob:preview",
   title: "Test Monument",
   description: "Monument desc",
   ...overrides,
});

let fetchMock: ReturnType<typeof vi.fn>;

const respond = (status: number, body: unknown = {}) => {
   fetchMock.mockResolvedValue(
      new Response(status >= 400 ? JSON.stringify(body) : JSON.stringify(body), { status }),
   );
};

beforeEach(() => {
   fetchMock = vi.fn();
   vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("uploadSingleFile — success", () => {
   it("posts a multipart form to /upload and returns ok with the result", async () => {
      fetchMock.mockResolvedValue(
         new Response(
            JSON.stringify({
               filename: "Test_Monument.jpg",
               url: "https://commons.wikimedia.org/wiki/File:Test_Monument.jpg",
            }),
            { status: 200 },
         ),
      );

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});

      expect(outcome.ok).toBe(true);
      expect(outcome.result?.filename).toBe("Test_Monument.jpg");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/upload");
      expect(init.method).toBe("POST");
   });

   it("forwards EXIF coords, category and inventory into the form", async () => {
      fetchMock.mockResolvedValue(
         new Response(JSON.stringify({ filename: "x.jpg" }), { status: 200 }),
      );

      await uploadSingleFile(
         makeFileItem({ latitude: 40.5, longitude: 47.1, capturedAt: "2026-01-01T10:00:00" }),
         "cc-by-sa-4.0",
         { commonsCategory: "Category:Nizami_Məqbərəsi", inventory: "AZ-0001" },
      );

      const body = fetchMock.mock.calls[0][1].body as FormData;
      expect(body.get("lat")).toBe("40.5");
      expect(body.get("lon")).toBe("47.1");
      expect(body.get("categories")).toBe("Category:Nizami_Məqbərəsi");
      expect(body.get("inventory")).toBe("AZ-0001");
      expect(body.get("capturedAt")).toBe("2026-01-01T10:00:00");
   });

   it("falls back to monument coords when EXIF coords are absent", async () => {
      fetchMock.mockResolvedValue(
         new Response(JSON.stringify({ filename: "x.jpg" }), { status: 200 }),
      );

      await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", { lat: 40.1, lon: 47.9 });

      const body = fetchMock.mock.calls[0][1].body as FormData;
      expect(body.get("lat")).toBe("40.1");
      expect(body.get("lon")).toBe("47.9");
   });
});

describe("uploadSingleFile — transient failures retry", () => {
   it("retries on a 5xx response and succeeds on the second attempt", async () => {
      fetchMock
         .mockResolvedValueOnce(
            new Response(JSON.stringify({ error: "backing up" }), { status: 503 }),
         )
         .mockResolvedValueOnce(
            new Response(JSON.stringify({ filename: "retried.jpg", url: "https://x" }), {
               status: 200,
            }),
         );

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});
      expect(outcome.ok).toBe(true);
      expect(outcome.result?.filename).toBe("retried.jpg");
      expect(fetchMock).toHaveBeenCalledTimes(2);
   });

   it("retries on transient HTTP 5xx and then fails after exhausting attempts", async () => {
      fetchMock
         .mockResolvedValueOnce(new Response(JSON.stringify({ error: "boom" }), { status: 500 }))
         .mockResolvedValueOnce(new Response(JSON.stringify({ error: "boom" }), { status: 500 }));

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});
      expect(outcome.ok).toBe(false);
      expect(outcome.failure).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
   });
});

describe("uploadSingleFile — permanent failures do not retry", () => {
   it("fails fast on a 4xx rejection (e.g. Commons warning)", async () => {
      respond(422, { error: "Commons rejected", code: "fileexists", details: "exists" });

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});
      expect(outcome.ok).toBe(false);
      expect(outcome.failure?.code).toBe("fileexists");
      expect(fetchMock).toHaveBeenCalledTimes(1);
   });

   it("maps a known code to a user-facing message after a network-level failure", async () => {
      // A thrown fetch (e.g. connection error) has no server message, so
      // uploadSingleFile falls back to uploadErrors' messageFor mapping.
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});
      expect(outcome.failure?.code).toBe("http_error");
      expect(outcome.failure?.message).toContain("Vikianbara qoşulma xətası");
   });

   it("surfaces the server-provided details message verbatim", async () => {
      respond(422, { code: "fileexists", details: "This name already exists" });

      const outcome = await uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {});
      expect(outcome.failure?.message).toBe("This name already exists");
   });
});

describe("uploadSingleFile — cancellation", () => {
   it("aborts the fetch and returns ok:false with no failure entry", async () => {
      // Simulate an abort-controlled fetch rejecting with AbortError.
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
         const signal = init.signal as AbortSignal;
         return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
               const error = new Error("aborted");
               error.name = "AbortError";
               reject(error);
            });
         });
      });

      const controller = new AbortController();
      const promise = uploadSingleFile(makeFileItem(), "cc-by-sa-4.0", {}, controller.signal);
      controller.abort();

      const outcome = await promise;
      expect(outcome.ok).toBe(false);
      expect(outcome.failure).toBeUndefined();
   });
});

describe("isHeicFile", () => {
   it("detects HEIC by extension or MIME type", () => {
      expect(isHeicFile(makeFile("photo.heic", "image/heic"))).toBe(true);
      expect(isHeicFile(makeFile("photo.heif", "image/heif"))).toBe(true);
      expect(isHeicFile(makeFile("photo.jpg", "image/jpeg"))).toBe(false);
      expect(isHeicFile(makeFile("photo.heic.jpg", "image/jpeg"))).toBe(false);
   });
});
