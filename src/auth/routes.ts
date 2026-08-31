import { Router } from "express";
import passport from "./passport.ts";

const router = Router();

router.get("/login", passport.authenticate("mediawiki"));

router.get(
   "/callback",
   passport.authenticate("mediawiki", {
      failureRedirect: "/auth/login",
      successRedirect: process.env.CLIENT_URL || "/",
   }),
);

router.get("/me", (req, res) => {
   if (req.isAuthenticated() && req.user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token, tokenSecret, ...publicProfile } = req.user;

      res.json(publicProfile);
   } else {
      res.status(401).json({ authenticated: false });
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
