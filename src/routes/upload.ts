import fs from "fs/promises";
import path from "path";
import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import type { WikiUser } from "@/types";
import { optimizeImage } from "@/utils/image";
import { uploadFile as uploadToCommons } from "@/utils/mediawiki";

const router = express.Router();

// Rate Limiting: 20 uploads per 15 minutes
const uploadLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 20,
   message: { error: "Upload limit reached. Please try again later." },
});

// Disk Storage Configuration
const uploadDir = "/tmp/wlmaz-uploads";
// Ensure dir exists (async check/create could be done on startup, but mkdir recursive is safe)
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
   destination: (_req, _file, cb) => {
      cb(null, uploadDir);
   },
   filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
   },
});

const upload = multer({
   storage: storage,
   limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Status Check Endpoint
router.get("/status", (_req, res) => {
   res.json({ enabled: process.env.ENABLE_UPLOADS === "true" });
});

router.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
   // Feature Flag Check
   if (process.env.ENABLE_UPLOADS !== "true") {
      res.status(403).json({ error: "Uploads are currently disabled." });
      return;
   }

   if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
   }

   if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
   }

   // Path to the temp file
   const filePath = req.file.path;

   try {
      // Extract user's real IP (Express handles X-Forwarded-For when trust proxy is enabled)
      const userIp = req.ip || req.headers["x-forwarded-for"] as string || "unknown";
      console.log(`[Upload] User IP: ${userIp}`);

      const { title, description, license, lat, lon, categories } = req.body;

      if (!title || !description) {
         res.status(400).json({ error: "Missing title or description" });
         return;
      }

      // Map license to Wiki template
      // Default to cc-by-sa-4.0 if invalid or missing
      let licenseTemplate = "{{self|cc-by-sa-4.0}}";
      if (license === "cc-by-4.0") licenseTemplate = "{{self|cc-by-4.0}}";
      if (license === "cc0") licenseTemplate = "{{self|cc0}}";

      // Format Location template if coordinates exist
      let locationTemplate = "";
      if (lat && lon) {
         locationTemplate = `\n{{Location|${lat}|${lon}}}`;
      }

      // Format Categories
      // Base category + specific monument category
      let categoryText = "[[Category:Wiki Loves Monuments 2025 in Azerbaijan]]";
      if (categories) {
         categoryText += `\n[[Category:${categories}]]`;
      }

      // Format wikitext description
      const wikitext = `== {{int:filedesc}} ==
{{Information
|description={{en|1=${description}}}
|date=${new Date().toISOString().split("T")[0]}
|source={{own}}
|author=[[User:${req.user.username}|${req.user.username}]]
|permission=
|other_versions=
}}
${locationTemplate}

== {{int:license-header}} ==
${licenseTemplate}

${categoryText}
`;

      // Optimize image before upload
      // Read file buffer from disk
      const fileBuffer = await fs.readFile(filePath);
      const optimized = await optimizeImage(fileBuffer);

      // Determine final properties
      let finalBuffer = optimized.buffer;
      let finalMime = optimized.mimetype;
      let finalExt = optimized.extension;

      // Ensure extension matches
      let finalFilename = title;
      if (!finalFilename.toLowerCase().endsWith("." + finalExt)) {
         finalFilename += "." + finalExt;
      }

      // Upload to Commons (using the optimized buffer)
      const result = await uploadToCommons(
         req.user as WikiUser,
         {
            name: finalFilename,
            buffer: finalBuffer,
            mimetype: finalMime,
         },
         {
            text: wikitext,
            comment: `Uploaded via wikilovesmonuments.az`,
         },
         userIp, // Pass user's real IP to avoid Hetzner IP block
      );

      res.json({
         filename: result.filename,
         url: result.url,
      });
   } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
         error: error.message || "Upload failed",
         details: error.toString(),
      });
   } finally {
      // Clean up temp file
      if (req.file) {
         await fs
            .unlink(filePath)
            .catch((err) => console.error("Failed to cleanup temp file:", err));
      }
   }
});

export default router;
