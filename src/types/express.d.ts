import type { WikiUser } from "@/types/users.ts";

/**
 * Extends Express Request object to include our WikiUser.
 * This fixes `req.user.tokenSecret` errors in your backend routes.
 */
declare global {
   namespace Express {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      interface User extends WikiUser {}
   }
}

export {};
