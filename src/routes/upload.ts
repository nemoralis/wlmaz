import { Router } from 'express'
const router = Router()

router.post('/', (req, res) => {
  // Later: handle upload using req.user.token + req.user.tokenSecret
  res.send('Upload endpoint (to be implemented)')
})

export default router
