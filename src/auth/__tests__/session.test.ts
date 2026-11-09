import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { establishSession } from "@/auth/session.ts";

interface FailureOptions {
   regenerateError?: Error;
   loginError?: Error;
   saveError?: Error;
}

const makeRequest = (options: FailureOptions = {}) => {
   const session = {
      regenerate: vi.fn((callback: (error?: Error) => void) => callback(options.regenerateError)),
      save: vi.fn((callback: (error?: Error) => void) => callback(options.saveError)),
      destroy: vi.fn((callback: (error?: Error) => void) => callback()),
   };
   const login = vi.fn((_user: unknown, callback: (error?: Error) => void) =>
      callback(options.loginError),
   );

   const req = {
      user: { username: "Example" },
      session,
      login,
   } as unknown as Request;

   return { req, session, login };
};

describe("establishSession", () => {
   it("regenerates the session, logs the user in and saves it", async () => {
      const { req, session, login } = makeRequest();

      await expect(establishSession(req)).resolves.toBeUndefined();

      expect(session.regenerate).toHaveBeenCalledOnce();
      expect(login).toHaveBeenCalledOnce();
      expect(session.save).toHaveBeenCalledOnce();
      expect(session.destroy).not.toHaveBeenCalled();
   });

   it("destroys the partial session and skips save when login fails", async () => {
      const loginError = new Error("login failed");
      const { req, session } = makeRequest({ loginError });

      await expect(establishSession(req)).rejects.toBe(loginError);

      expect(session.destroy).toHaveBeenCalledOnce();
      expect(session.save).not.toHaveBeenCalled();
   });

   it("destroys the partial session when save fails", async () => {
      const saveError = new Error("save failed");
      const { req, session } = makeRequest({ saveError });

      await expect(establishSession(req)).rejects.toBe(saveError);

      expect(session.save).toHaveBeenCalledOnce();
      expect(session.destroy).toHaveBeenCalledOnce();
   });

   it("does not attempt login when regeneration fails", async () => {
      const regenerateError = new Error("regenerate failed");
      const { req, session, login } = makeRequest({ regenerateError });

      await expect(establishSession(req)).rejects.toBe(regenerateError);

      expect(login).not.toHaveBeenCalled();
      expect(session.save).not.toHaveBeenCalled();
   });
});
