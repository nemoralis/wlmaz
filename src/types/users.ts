/**
 * Full user type including OAuth tokens — used by Passport
 * serialization and Express session. The frontend should
 * use PublicWikiUser from ./api.ts instead.
 */
export interface WikiUser {
   id: string;
   username: string;
   token: string;
   tokenSecret: string;
   profile?: Record<string, unknown>;
   blocked?: boolean;
   blockreason?: string;
}