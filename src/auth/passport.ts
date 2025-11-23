import { WikiUser } from "@/types";
import passport from "passport";
// @ts-ignore
import { Strategy as MediaWikiStrategy } from "passport-mediawiki-oauth";
if (!process.env.WM_CONSUMER_KEY || !process.env.WM_CONSUMER_SECRET) {
   throw new Error("WM_CONSUMER_KEY and WM_CONSUMER_SECRET must be set");
}

passport.use(
   new MediaWikiStrategy(
      {
         consumerKey: process.env.WM_CONSUMER_KEY,
         consumerSecret: process.env.WM_CONSUMER_SECRET,
         callbackURL: "http://localhost:3000/auth/callback",
         baseURL: "https://commons.wikimedia.org/",
      },
      (token: string, tokenSecret: string, profile: any, done: any) => {
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
