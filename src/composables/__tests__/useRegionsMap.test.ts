import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression guard for the loading flag.
 *
 * `isLoading` used to be set true on request and only ever cleared alongside
 * `inFlight`, never itself, so it stayed true after the fetch resolved. Every
 * caller gates its content on it, which left the map permanently showing
 * "Yüklənir..." with no SVG on the page.
 *
 * The module memoises its payload, so each test resets it through a fresh
 * dynamic import rather than shared state.
 */
const validPayload = JSON.stringify({
   viewBox: "0 0 1000 757",
   regions: [{ name: "Səbail", path: "M1 1L2 2L3 1Z" }],
});

const freshComposables = async () => {
   vi.resetModules();
   return import("@/composables/useRegionsMap.ts");
};

/** Installs a fetch stub and returns the spy so call counts can be asserted. */
const mockFetch = (body: string | null, ok = true) => {
   const spy = vi.fn(async () => ({
      ok,
      status: ok ? 200 : 404,
      statusText: ok ? "OK" : "Not Found",
      text: async () => body ?? "",
   }));
   vi.stubGlobal("fetch", spy);
   return spy;
};

beforeEach(() => {
   vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("useRegionsMap", () => {
   it("clears isLoading once the payload resolves", async () => {
      mockFetch(validPayload);
      const { useRegionsMap } = await freshComposables();
      const { load, isLoading, payload } = useRegionsMap();

      expect(isLoading.value).toBe(false);

      await load();

      expect(isLoading.value).toBe(false);
      expect(payload.value?.viewBox).toBe("0 0 1000 757");
      expect(payload.value?.regions).toHaveLength(1);
   });

   it("is loading while the request is in flight", async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
         release = resolve;
      });
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => {
            await gate;
            return { ok: true, status: 200, statusText: "OK", text: async () => validPayload };
         }),
      );

      const { useRegionsMap } = await freshComposables();
      const { load, isLoading } = useRegionsMap();

      const pending = load();
      expect(isLoading.value).toBe(true);

      release();
      await pending;
      expect(isLoading.value).toBe(false);
   });

   it("clears isLoading when the fetch fails", async () => {
      mockFetch(null, false);
      const { useRegionsMap } = await freshComposables();
      const { load, isLoading, loadFailed, payload } = useRegionsMap();

      await load();

      expect(isLoading.value).toBe(false);
      expect(loadFailed.value).toBe(true);
      expect(payload.value).toBeNull();
   });

   it("clears isLoading when the payload is malformed", async () => {
      mockFetch("{ not json");
      const { useRegionsMap } = await freshComposables();
      const { load, isLoading, loadFailed } = useRegionsMap();

      await load();

      expect(isLoading.value).toBe(false);
      expect(loadFailed.value).toBe(true);
   });

   it("shares one request between concurrent callers", async () => {
      const fetchMock = mockFetch(validPayload);
      const { useRegionsMap } = await freshComposables();
      const first = useRegionsMap();
      const second = useRegionsMap();

      await Promise.all([first.load(), second.load()]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second.payload.value).not.toBeNull();
   });

   it("resolves a region by name, folding the district suffix", async () => {
      mockFetch(validPayload);
      const { useRegionsMap } = await freshComposables();
      const { load, findRegion } = useRegionsMap();
      await load();

      expect(findRegion("Səbail")?.name).toBe("Səbail");
      expect(findRegion("Səbail rayonu")?.name).toBe("Səbail");
   });

   it("returns null for a name that is not a region", async () => {
      mockFetch(validPayload);
      const { useRegionsMap } = await freshComposables();
      const { load, findRegion } = useRegionsMap();
      await load();

      expect(findRegion("Atlantis")).toBeNull();
      expect(findRegion("Bakı")).toBeNull();
      expect(findRegion(undefined)).toBeNull();
      expect(findRegion("")).toBeNull();
   });
});
