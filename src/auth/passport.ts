import passport from "passport";
import { Strategy as MediaWikiStrategy } from "passport-mediawiki-oauth";
import type { WikiUser } from "@/types";
import { config } from "@/config";
import { isLocalMediaWikiEnabled } from "@/utils/mediawikiConfig";

// In local dev-upload mode we authenticate to a local MediaWiki via a Bot
// Password (see mediawikiConfig.ts), so the Commons OAuth strategy is not
// registered and consumer keys are not required. Every other mode (production
// and the Commons OAuth test flow) needs them.
if (!isLocalMediaWikiEnabled()) {
   passport.use(
      new MediaWikiStrategy(
         {
            consumerKey: config.oauth.consumerKey,
            consumerSecret: config.oauth.consumerSecret,
            callbackURL: `${config.clientUrl}/auth/callback`,
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
}

passport.serializeUser((user, done) => {
   done(null, user);
});

passport.deserializeUser((user: WikiUser, done) => {
   done(null, user);
});

export default passport;
