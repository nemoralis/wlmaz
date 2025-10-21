import passport from "passport";
// @ts-ignore
import { Strategy as MediaWikiStrategy } from "passport-mediawiki-oauth";

passport.use(
  new MediaWikiStrategy(
    {
      consumerKey: process.env.WM_CONSUMER_KEY,
      consumerSecret: process.env.WM_CONSUMER_SECRET,
      callbackURL: "http://localhost:3000/auth/callback",
      baseURL: "https://commons.wikimedia.org/",
    },
    (token: string, tokenSecret: string, profile: any, done: any) => {
      done(null, { token, tokenSecret, profile });
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj!);
});

export default passport;
