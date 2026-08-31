import { Router, type NextFunction, type Request, type Response } from "express";
import passport from "./passport.ts";
import { logger } from "../utils/logger";

const router = Router();

const authDebug = (where: string) => (req: Request, _res: Response, next: NextFunction) => {
   logger.info(`[AUTH-DEBUG] ${where}:`);
   logger.info(`  sessionID: ${req.sessionID}`);
   logger.info(`  protocol: ${req.protocol}, secure: ${req.secure}`);
   logger.info(`  x-forwarded-proto: ${req.headers["x-forwarded-proto"]}`);
   logger.info(`  x-forwarded-host: ${req.headers["x-forwarded-host"]}`);
   logger.info(`  x-forwarded-port: ${req.headers["x-forwarded-port"]}`);
   logger.info(`  host: ${req.headers.host}`);
   logger.info(`  cookie: ${req.headers.cookie || "(none)"}`);
   logger.info(`  session keys: ${JSON.stringify(Object.keys(req.session || {}))}`);
   const sessionData = req.session as unknown as Record<string, unknown>;
   logger.info(`  oauth:mediawiki present: ${Boolean(sessionData?.["oauth:mediawiki"])}`);
   logger.info(`  full URL: ${req.protocol}://${req.get("host")}${req.originalUrl}`);
   next();
};

router.get("/login", authDebug("/auth/login"), passport.authenticate("mediawiki"));

router.get(
   "/callback",
   authDebug("/auth/callback"),
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
