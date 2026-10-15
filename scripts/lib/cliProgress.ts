/**
 * Tiny terminal progress reporter for the data-pipeline scripts.
 *
 * No dependency: on a TTY it renders one animated line (spinner + byte
 * counter, or a determinate bar when the total size is known) and rewrites it
 * in place; anywhere else (cron logs, CI, piped output) it degrades to plain
 * start/finish lines with no escape codes.
 */

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BAR_CELLS = 24;
const TICK_MS = 100;

export interface ProgressReporter {
   /** Update the live line. `total` is null when the size is unknown (streamed). */
   update(loaded: number, total?: number | null): void;
   /** Erase the live line and print `✓ <message>`. */
   succeed(message: string): void;
   /** Erase the live line and print `✗ <message>` to stderr. */
   fail(message: string): void;
   /** Erase the live line without printing anything. */
   clear(): void;
}

/** Human byte size: 512 B, 3.2 KB, 6.6 MB. */
export const formatBytes = (bytes: number): string => {
   const units = ["B", "KB", "MB", "GB"];
   let value = Math.max(0, bytes);
   let unit = 0;
   while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
   }
   const decimals = unit === 0 ? 0 : 1;
   return `${value.toFixed(decimals)} ${units[unit]}`;
};

/** Transfer rate, e.g. `812 KB/s`. */
export const formatRate = (bytesPerSecond: number): string =>
   `${formatBytes(Math.max(0, Math.round(bytesPerSecond)))}/s`;

const renderBar = (ratio: number): string => {
   const filled = Math.min(BAR_CELLS, Math.max(0, Math.round(ratio * BAR_CELLS)));
   return `${"█".repeat(filled)}${"░".repeat(BAR_CELLS - filled)}`;
};

export const createProgressReporter = (label: string): ProgressReporter => {
   const isTTY = Boolean(process.stdout.isTTY) && !process.env.CI;

   if (!isTTY) {
      // Plain log: mark the phase once, then only report its outcome.
      console.log(label);
      return {
         update: () => {},
         succeed: (message) => console.log(message),
         fail: (message) => console.error(message),
         clear: () => {},
      };
   }

   const startedAt = Date.now();
   let frame = 0;
   let loaded = 0;
   let total: number | null = null;
   let timer: ReturnType<typeof setInterval> | null = null;

   const erase = (): void => {
      process.stdout.write("\r\x1b[K");
   };

   const line = (): string => {
      const elapsedMs = Date.now() - startedAt;
      const elapsed = `${Math.max(1, Math.round(elapsedMs / 1000))}s`;
      const rate = formatRate((loaded * 1000) / Math.max(1, elapsedMs));

      if (total && total > 0) {
         const ratio = Math.min(1, loaded / total);
         return `${SPINNER_FRAMES[frame]} ${label} ${renderBar(ratio)} ${Math.round(ratio * 100)}%  ${formatBytes(loaded)} / ${formatBytes(total)}  ${elapsed}`;
      }
      return `${SPINNER_FRAMES[frame]} ${label} ${formatBytes(loaded)}  ${rate}  ${elapsed}`;
   };

   const stop = (): void => {
      if (timer !== null) {
         clearInterval(timer);
         timer = null;
      }
   };

   const render = (): void => {
      // Single write so the erase + redraw land atomically in the terminal.
      process.stdout.write(`\r\x1b[K${line()}`);
   };

   return {
      update(newLoaded, newTotal) {
         loaded = newLoaded;
         if (newTotal !== undefined) total = newTotal;
         if (timer === null) {
            timer = setInterval(() => {
               frame = (frame + 1) % SPINNER_FRAMES.length;
               render();
            }, TICK_MS);
            // Never keep the process alive just to animate.
            if (typeof timer.unref === "function") timer.unref();
         }
         render();
      },
      succeed(message) {
         stop();
         erase();
         console.log(message);
      },
      fail(message) {
         stop();
         erase();
         console.error(message);
      },
      clear() {
         stop();
         erase();
      },
   };
};
