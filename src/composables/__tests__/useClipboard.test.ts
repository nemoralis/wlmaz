import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClipboard } from "@/composables/useClipboard.ts";

const stubClipboard = (writeText: (text: string) => Promise<void>) => {
   vi.stubGlobal("navigator", { clipboard: { writeText } });
};

beforeEach(() => {
   vi.useFakeTimers();
   // The composable registers an unmount hook; these tests call it outside a
   // component instance, which Vue only warns about.
   vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
   vi.useRealTimers();
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("useClipboard", () => {
   it("keeps the success state for the full window of the latest copy", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);

      const { copied, copy } = useClipboard(1000);

      await copy("first");
      expect(copied.value).toBe(true);

      vi.advanceTimersByTime(600);
      await copy("second");
      expect(copied.value).toBe(true);

      // The first timer would have fired here; the second copy must have
      // restarted the window instead of inheriting the older deadline.
      vi.advanceTimersByTime(600);
      expect(copied.value).toBe(true);

      vi.advanceTimersByTime(400);
      expect(copied.value).toBe(false);
      expect(writeText).toHaveBeenCalledTimes(2);
   });

   it("does not report success when the clipboard write fails", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("denied"));
      stubClipboard(writeText);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { copied, copy } = useClipboard(1000);
      await copy("text");

      expect(copied.value).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
   });

   it("ignores empty values without touching the clipboard", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);

      const { copied, copy } = useClipboard(1000);
      await copy("");

      expect(copied.value).toBe(false);
      expect(writeText).not.toHaveBeenCalled();
   });
});
