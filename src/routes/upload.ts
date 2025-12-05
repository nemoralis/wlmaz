import { Router } from "express";
const router = Router();

router.post("/", (_req, res) => {
   res.send("Upload endpoint (to be implemented)");
});

export default router;
