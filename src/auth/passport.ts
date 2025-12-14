import passport from "passport";
import { Strategy as MediaWikiStrategy } from "passport-mediawiki-oauth";
import type { WikiUser } from "@/types";

if (!process.env.WM_CONSUMER_KEY || !process.env.WM_CONSUMER_SECRET) {
   throw new Error("WM_CONSUMER_KEY and WM_CONSUMER_SECRET must be set");
}

passport.use(
   new MediaWikiStrategy(
      {
         consumerKey: process.env.WM_CONSUMER_KEY,
         consumerSecret: process.env.WM_CONSUMER_SECRET,
         callbackURL: `${process.env.CLIENT_URL || "http://localhost:3000"}/auth/callback`,
         baseURL: "https://commons.wikimedia.org/",
      },
      (
         token: string,
         tokenSecret: string,
         profile: WikiUser & { displayName?: string; id: string; username: string },
         done: (err: any, user?: WikiUser) => void,
      ) => {
         const user: WikiUser = {
            id: profile.id,
            username: profile.displayName || profile.username,
            token: token,
            tokenSecret: tokenSecret,
         };

         done(null, user);
      },
   ),
);

passport.serializeUser((user, done) => {
   done(null, user);
});

passport.deserializeUser((user: WikiUser, done) => {
   done(null, user);
});

export default passport;
