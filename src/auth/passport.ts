import passport from 'passport'
// @ts-ignore
import { Strategy as MediaWikiStrategy } from 'passport-mediawiki-oauth'

passport.use(
  new MediaWikiStrategy(
    {
      consumerKey: process.env.WM_CONSUMER_KEY!,
      consumerSecret: process.env.WM_CONSUMER_SECRET!,
      callbackURL: 'http://localhost:3000/auth/callback'
    },
    (
      token: string,
      tokenSecret: string,
      profile: any,
      done: (err: any, user?: any) => void
    ) => {
      done(null, { token, tokenSecret, profile })
    }
  )
)

passport.serializeUser((user: any, done) => done(null, user))
passport.deserializeUser((obj: any, done) => done(null, obj))
