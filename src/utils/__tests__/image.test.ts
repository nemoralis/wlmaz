import { describe, expect, it } from "vitest";
import { withImageSlot } from "@/utils/image.ts";

describe("withImageSlot", () => {
   it("never runs more than two image pipelines at once", async () => {
      let active = 0;
      let peak = 0;
      const release: Array<() => void> = [];

      const pending = Array.from({ length: 5 }, () =>
         withImageSlot(() => {
            active++;
            peak = Math.max(peak, active);
            return new Promise<void>((resolve) => {
               release.push(() => {
                  active--;
                  resolve();
               });
            });
         }),
      );

      expect(active).toBe(2);
      const done = Promise.all(pending);
      while (release.length) {
         release.shift()?.();
         await Promise.resolve();
      }
      await done;
      expect(peak).toBe(2);
   });
});
