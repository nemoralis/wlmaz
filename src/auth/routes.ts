import { Router } from "express";
import passport from "@/auth/passport.ts";
import { establishSession } from "@/auth/session.ts";
import type { AuthUnauthenticatedResponse, PublicWikiUser } from "@/types/api.ts";
import { logger } from "@/utils/logger.ts";

const router = Router();

router.get("/login", passport.authenticate("mediawiki"));

router.get(
   "/callback",
   passport.authenticate("mediawiki", { failureRedirect: "/auth/login" }),
   async (req, res) => {
      try {
         await establishSession(req);
         res.redirect("/");
      } catch (error) {
         logger.error("OAuth callback could not establish a session:", error);
         // The browser must not keep a cookie that points at a session we
         // intentionally destroyed (or failed to persist).
         res.clearCookie("wlmaz");
         res.status(500).json({ error: "Session error" });
      }
   },
);

router.get("/me", (req, res) => {
   res.setHeader("Cache-Control", "no-store");

   if (req.isAuthenticated() && req.user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token, tokenSecret, ...publicProfile } = req.user;

      res.json(publicProfile as PublicWikiUser);
   } else {
      res.status(401).json({ authenticated: false } satisfies AuthUnauthenticatedResponse);
   }
});

router.post("/logout", (req, res, next) => {
   req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
         if (err) return next(err);
         // Clear the session cookie by its configured name ("wlmaz"), not the
         // default connect.sid name that was here before.
         res.clearCookie("wlmaz");
         res.json({ success: true });
      });
   });
});

export default router;
