import { Router } from 'express'
import passport from 'passport'
import './passport'

const router = Router()

// Start Wikimedia OAuth login
router.get('/login', passport.authenticate('mediawiki'))

// Callback URL configured in MediaWikiStrategy
router.get(
  '/callback',
  passport.authenticate('mediawiki', { failureRedirect: '/' }),
  (req, res) => {
    res.send('OAuth success! You can now upload photos.')
  }
)

export default router
