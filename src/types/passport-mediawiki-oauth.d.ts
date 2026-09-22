declare module "passport-mediawiki-oauth" {
   import { Strategy as PassportStrategy } from "passport";

   export interface MediaWikiStrategyOptions {
      consumerKey: string;
      consumerSecret: string;
      callbackURL: string;
      baseURL: string;
   }

   export interface MediaWikiProfile {
      id: string;
      username: string;
      displayName?: string;
      provider?: string;
   }

   export type MediaWikiVerify = (
      token: string,
      tokenSecret: string,
      profile: MediaWikiProfile,
      verified: (error: Error | null, user?: unknown) => void,
   ) => void;

   export class Strategy extends PassportStrategy {
      constructor(options: MediaWikiStrategyOptions, verify: MediaWikiVerify);
   }
}
