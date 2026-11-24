import type { Request } from "express";

/**
 * Replaces the pre-login session with a fresh one and stores the authenticated
 * user in it.
 *
 * `regenerate` prevents session fixation, but it also discards the previous
 * session before we know the new one can be created and persisted. If a later
 * step fails, destroy the partial session instead of leaving the browser with a
 * half-authenticated cookie. The previous session cannot be restored at that
 * point; "fail cleanly" is the strongest guarantee available.
 */
export function establishSession(req: Request): Promise<void> {
   const oldId = req.sessionID;
   return new Promise((resolve, reject) => {
      req.session.regenerate((regenerateError) => {
         if (regenerateError) {
            // Regenerate can fail after deleting the old record; make sure the
            // pre-login session (and its OAuth token) cannot still be reused.
            req.sessionStore.destroy(oldId, () => reject(regenerateError));
            return;
         }

         req.login(req.user!, (loginError) => {
            if (loginError) {
               destroyPartialSession(req, loginError, reject);
               return;
            }

            req.session.save((saveError) => {
               if (saveError) {
                  destroyPartialSession(req, saveError, reject);
                  return;
               }
               resolve();
            });
         });
      });
   });
}

function destroyPartialSession(
   req: Request,
   cause: unknown,
   reject: (reason: unknown) => void,
): void {
   req.session.destroy(() => {
      // The destroy error is secondary; report the step that actually failed.
      reject(cause);
   });
}
