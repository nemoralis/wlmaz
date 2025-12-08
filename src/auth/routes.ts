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

router.get("/logout", (req, res, next) => {
   req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
         if (err) return next(err);
         res.clearCookie("connect.sid");
         res.json({ success: true });
      });
   });
});

export default router;
