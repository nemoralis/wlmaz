import passport from "passport";
import { Strategy as MediaWikiStrategy } from "passport-mediawiki-oauth";
import { config } from "@/config";
import type { WikiUser } from "@/types";
import type { MediaWikiProfile } from "passport-mediawiki-oauth";
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
            profile: MediaWikiProfile,
            done: (err: Error | null, user?: WikiUser) => void,
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
