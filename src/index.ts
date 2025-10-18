import express from 'express'
import session from 'express-session'
import 'dotenv/config'
import passport from './auth/passport.ts'
import authRoutes from './auth/routes.ts'
import uploadRoutes from './routes/upload.ts'
import cors from 'cors'

const app = express()

app.use(express.json())

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

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

app.listen(3000, () => console.log('Backend server is running on http://localhost:3000'))
