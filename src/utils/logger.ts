/**
 * Minimal structured logger for the backend.
 *
 * Wraps console.* with log-level filtering so debug noise can be silenced in
 * production without shipping an external logging dependency.
 *
 * Level can be controlled via LOG_LEVEL (debug | info | warn | error).
 * Defaults to "info" in production and "debug" otherwise.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

const configured: LogLevel =
   ((process.env.LOG_LEVEL as LogLevel | undefined)?.toLowerCase() as LogLevel) ??
   (process.env.NODE_ENV === "production" ? "info" : "debug");

const threshold = LEVELS.indexOf(configured) >= 0 ? LEVELS.indexOf(configured) : 1;

const shouldLog = (level: LogLevel): boolean => LEVELS.indexOf(level) >= threshold;

const log = (level: LogLevel, args: unknown[]): void => {
   if (!shouldLog(level)) return;
   const method =
      level === "debug" ? "debug" : level === "info" ? "info" : level === "warn" ? "warn" : "error";
   console[method]("[wlmaz]", ...args);
};

export const logger = {
   debug: (...args: unknown[]): void => log("debug", args),
   info: (...args: unknown[]): void => log("info", args),
   warn: (...args: unknown[]): void => log("warn", args),
   error: (...args: unknown[]): void => log("error", args),
};
