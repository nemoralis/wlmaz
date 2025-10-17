import { Router } from 'express'
import passport from 'passport'
import './passport.ts'

const router = Router()

router.get('/login', passport.authenticate('mediawiki'))

router.get(
  '/callback',
  passport.authenticate('mediawiki', { failureRedirect: '/' }),
  (req, res) => {
    res.send('OAuth success! You can now upload photos.')
  }
)

export default router
