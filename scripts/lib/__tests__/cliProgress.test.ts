import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgressReporter, formatBytes, formatRate } from "../cliProgress";

const ESCAPE_CLEAR = "\r\x1b[K";

describe("formatBytes", () => {
   it("scales units, keeping one decimal above bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(6878878)).toBe("6.6 MB");
   });
});

describe("formatRate", () => {
   it("renders bytes per second", () => {
      expect(formatRate(812 * 1024)).toBe("812.0 KB/s");
      expect(formatRate(0)).toBe("0 B/s");
   });
});

describe("createProgressReporter", () => {
   const originalIsTTY = process.stdout.isTTY;
   let writes: string[];

   const captureWrites = () => {
      writes = [];
      const impl = (chunk: unknown) => {
         writes.push(String(chunk));
         return true;
      };
      vi.spyOn(process.stdout, "write").mockImplementation(impl as typeof process.stdout.write);
   };

   beforeEach(() => {
      vi.stubEnv("CI", "");
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
   });

   afterEach(() => {
      process.stdout.isTTY = originalIsTTY;
      vi.useRealTimers();
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
   });

   describe("on a TTY", () => {
      beforeEach(() => {
         process.stdout.isTTY = true;
         vi.useFakeTimers();
         captureWrites();
      });

      it("renders the label with a byte counter while the total is unknown", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(1.5 * 1024 * 1024, null);

         const line = writes.at(-1) ?? "";
         expect(line.startsWith(ESCAPE_CLEAR)).toBe(true);
         expect(line).toContain("Fetching…");
         expect(line).toContain("1.5 MB");
      });

      it("renders a determinate bar once the total is known", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(512 * 1024, 1024 * 1024);

         const line = writes.at(-1) ?? "";
         expect(line).toContain("█");
         expect(line).toContain("50%");
         expect(line).toContain("512.0 KB / 1.0 MB");
      });

      it("keeps animating on the interval", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(1024, null);
         const afterUpdate = writes.length;

         vi.advanceTimersByTime(300);

         expect(writes.length).toBeGreaterThan(afterUpdate);
      });

      it("erases the live line and prints the summary on succeed", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(2048, null);
         reporter.succeed("6.6 MB in 8.7s (812 KB/s)");

         expect(writes.at(-1)).toBe(ESCAPE_CLEAR);
         expect(console.log).toHaveBeenCalledWith("6.6 MB in 8.7s (812 KB/s)");
      });

      it("erases the live line and reports to stderr on fail, and stops on clear", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(2048, null);
         reporter.fail("boom");
         expect(console.error).toHaveBeenCalledWith("boom");

         const silent = createProgressReporter("Fetching…");
         silent.update(2048, null);
         const writesBeforeClear = writes.length;
         silent.clear();

         expect(writes.at(-1)).toBe(ESCAPE_CLEAR);
         expect(writes.length).toBe(writesBeforeClear + 1); // erase only, no frame
         expect(vi.getTimerCount()).toBe(0); // no leaked animation timer
      });
   });

   describe("without a TTY (logs, cron, CI)", () => {
      beforeEach(() => {
         process.stdout.isTTY = false;
         captureWrites();
      });

      it("marks the phase with a plain line and never touches stdout", () => {
         createProgressReporter("Fetching…");

         expect(console.log).toHaveBeenCalledWith("Fetching…");
         expect(writes).toEqual([]);
      });

      it("prints only the outcome lines", () => {
         const reporter = createProgressReporter("Fetching…");
         reporter.update(1024, null);
         reporter.succeed("done");

         expect(writes).toEqual([]);
         expect(console.log).toHaveBeenNthCalledWith(1, "Fetching…");
         expect(console.log).toHaveBeenNthCalledWith(2, "done");
      });
   });
});
