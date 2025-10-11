import express from 'express'
import session from 'express-session'
import 'dotenv/config'

import passport from 'passport'
import authRoutes from './auth/routes'
import uploadRoutes from './routes/upload'

const app = express()
app.use(express.json())

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.use('/auth', authRoutes)
app.use('/upload', uploadRoutes)

app.listen(3000, () => console.log('Server running on port 3000'))
