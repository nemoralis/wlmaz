import { describe, expect, it, vi } from "vitest";

/**
 * update-monuments.ts runs `main()` from an entry guard so its pipeline only
 * fires when the script is executed directly. These tests import it — which
 * only works because of that guard — and pin that no fetch happens.
 */
describe("update-monuments entry guard", () => {
   it("does not fetch (or run the pipeline) when the module is imported", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      await import("../../update-monuments");

      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
   });
});
