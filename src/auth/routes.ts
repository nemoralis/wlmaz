import { Router } from 'express'
import passport from './passport.ts'

const router = Router()

router.get('/login', passport.authenticate('mediawiki'))

router.get(
    '/callback',
    passport.authenticate('mediawiki', {
        failureRedirect: '/auth/login',
        successRedirect: 'http://localhost:5173/'
    })
)

router.get('/me', (req, res) => {
    if (req.isAuthenticated()) res.json(req.user)
    else res.status(401).json({ error: 'Not authenticated' })
})

router.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err)
        req.session.destroy(err => {
            if (err) return next(err)
            res.clearCookie('connect.sid')
            res.send({ success: true }) // for fetch
        })
    })
})



export default router
