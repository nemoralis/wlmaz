import fs from "fs/promises";
import path from "path";
import express from "express";
import multer from "multer";
import sharp from "sharp";
import type { WikiUser } from "@/types";
import { optimizeImage } from "@/utils/image";
import { uploadFile as uploadToCommons } from "@/utils/mediawiki";

const router = express.Router();

// Disk Storage Configuration
const uploadDir = "/tmp/wlmaz-uploads";

/**
 * Periodically cleans up orphaned temporary upload files.
 * Security: Reduces risk of Disk Exhaustion (DoS) by ensuring temp files
 * from failed/interrupted uploads don't accumulate indefinitely.
 */
const cleanupTempFiles = async () => {
   try {
      // Ensure dir exists with restricted permissions (0700)
      await fs.mkdir(uploadDir, { recursive: true, mode: 0o700 });
      const files = await fs.readdir(uploadDir);
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;

      for (const file of files) {
         const filePath = path.join(uploadDir, file);
         // Use lstat to avoid following symlinks during cleanup in /tmp
         const stats = await fs.lstat(filePath);
         // Orphaned files older than 1 hour are deleted. 24h was too long
         // given the potential for automated abuse.
         if (now - stats.mtimeMs > ONE_HOUR) {
            await fs.unlink(filePath).catch((err) => console.error("Failed to GC temp file:", err));
         }
      }
   } catch (err) {
      console.error("Temp file garbage collection error:", err);
   }
};

// Initial cleanup on startup to clear any leftovers from previous crashes
cleanupTempFiles();
// Background Cleanup for orphaned temp files - Check every 1 hour
// .unref() prevents the timer from keeping the process alive after graceful shutdown
setInterval(cleanupTempFiles, 60 * 60 * 1000).unref();

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
   limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
      fields: 10,
      fieldSize: 10 * 1024, // 10KB
      files: 1,
   },
   fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
         cb(null, true);
      } else {
         cb(new Error("Only image files are allowed"));
      }
   },
});

/**
 * Middleware to ensure the user is authenticated before processing uploads.
 * This prevents unauthenticated users from consuming server resources/disk space.
 */
const ensureAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
   if (req.isAuthenticated() && req.user) {
      return next();
   }
   res.status(401).json({ error: "Unauthorized" });
};

/**
 * Middleware to check if uploads are enabled globally.
 */
const checkUploadsEnabled = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
   if (process.env.ENABLE_UPLOADS !== "true") {
      res.status(403).json({ error: "Uploads are currently disabled." });
      return;
   }
   next();
};

// Status Check Endpoint
router.get("/status", (_req, res) => {
   res.json({ enabled: process.env.ENABLE_UPLOADS === "true" });
});

router.post("/", checkUploadsEnabled, ensureAuthenticated, upload.single("file"), async (req, res) => {
   if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
   }

   // Path to the temp file
   const filePath = req.file.path;

   try {
      let { title, description, license, lat, lon, categories } = req.body;

      if (!title || !description) {
         res.status(400).json({ error: "Missing title or description" });
         return;
      }

      // Security: Validate input lengths to prevent resource abuse and comply with upstream limits.
      // We cast to String to handle unexpected types and avoid crashing on undefined/null.
      if (
         String(title).length > 255 ||
         String(description).length > 2000 ||
         (categories && String(categories).length > 255)
      ) {
         res.status(400).json({ error: "Input too long" });
         return;
      }

      // Ensure inputs are strings and sanitize to prevent wikitext injection and invalid filenames
      const sanitizeWikitext = (text: string) => String(text || "").replace(/[\[\]{}|]/g, "").trim();
      const sanitizeFilename = (name: string) =>
         String(name || "")
            .substring(0, 128) // Truncate early to prevent excessive processing
            .replace(/[\x00-\x1F\x7F]/g, "") // Strip control characters
            .replace(/[#<>\[\]|{}\/:\?%\*\\\^]/g, "_") // More comprehensive forbidden char list
            .replace(/^[\s\.]+/, "") // Cannot start with space or dot
            .trim();

      const safeTitle = sanitizeFilename(title);

      // Security: Ensure filename is not empty after sanitization to prevent
      // invalid upload requests to Wikimedia Commons.
      if (!safeTitle) {
         res.status(400).json({
            error: "Invalid title: filename is empty or contains only forbidden characters",
         });
         return;
      }

      const safeDescription = sanitizeWikitext(description);
      const safeCategories = sanitizeWikitext(categories);
      // Sanitize the username even though it comes from a trusted OAuth session.
      // Wikimedia usernames should never contain wikitext-special characters, but
      // being defensive here prevents template corruption if that assumption breaks.
      const safeUsername = sanitizeWikitext(req.user!.username).replace(/\|/g, "");

      // Map license to Wiki template
      // Default to cc-by-sa-4.0 if invalid or missing
      let licenseTemplate = "{{self|cc-by-sa-4.0}}";
      if (license === "cc-by-4.0") licenseTemplate = "{{self|cc-by-4.0}}";
      if (license === "cc0") licenseTemplate = "{{self|cc0}}";

      // Format Location template if coordinates exist - validate as floats and range check
      let locationTemplate = "";
      const latF = parseFloat(lat);
      const lonF = parseFloat(lon);
      if (
         !isNaN(latF) &&
         !isNaN(lonF) &&
         latF >= -90 &&
         latF <= 90 &&
         lonF >= -180 &&
         lonF <= 180
      ) {
         locationTemplate = `\n{{Location|${latF}|${lonF}}}`;
      }

      // Format Categories
      // Base category + specific monument category
      let categoryText = "[[Category:Wiki Loves Monuments 2025 in Azerbaijan]]";
      if (safeCategories) {
         categoryText += `\n[[Category:${safeCategories}]]`;
      }

      // Format wikitext description
      const wikitext = `== {{int:filedesc}} ==
{{Information
|description={{en|1=${safeDescription}}}
|date=${new Date().toISOString().split("T")[0]}
|source={{own}}
|author=[[User:${safeUsername}|${safeUsername}]]
|permission=
|other_versions=
}}
${locationTemplate}

== {{int:license-header}} ==
${licenseTemplate}

${categoryText}
`;

      // Read file buffer from disk
      const fileBuffer = await fs.readFile(filePath);

      // Content-based image validation: Sharp.metadata() throws for any buffer
      // that is not a recognised image format.  This catches disguised uploads
      // (e.g. a script sent with Content-Type: image/jpeg) that slip past
      // multer's client-supplied MIME check.
      try {
         await sharp(fileBuffer).metadata();
      } catch {
         res.status(400).json({ error: "Invalid image: file content is not a recognised image format" });
         return;
      }

      const optimized = await optimizeImage(fileBuffer);

      // Determine final properties
      let finalBuffer = optimized.buffer;
      let finalMime = optimized.mimetype;
      let finalExt = optimized.extension || path.extname(req.file.originalname);

      // Ensure extension starts with a dot for consistent check
      if (finalExt && !finalExt.startsWith(".")) {
         finalExt = "." + finalExt;
      }

      // Ensure extension matches
      let finalFilename = safeTitle;
      if (finalExt && !finalFilename.toLowerCase().endsWith(finalExt.toLowerCase())) {
         finalFilename += finalExt;
      }

      // Upload to Commons (using the optimized buffer)
      const result = await uploadToCommons(
         req.user! as WikiUser,
         {
            name: finalFilename,
            buffer: finalBuffer,
            mimetype: finalMime,
         },
         {
            text: wikitext,
            comment: `Uploaded via wikilovesmonuments.az`,
         },
      );

      res.json({
         filename: result.upload?.filename,
         url:
            result.upload?.imageinfo?.descriptionurl ||
            `https://commons.wikimedia.org/wiki/File:${result.upload?.filename}`,
      });
   } catch (error: any) {
      console.error("Upload error:", error);
      // Fail securely: do not leak internal error details or stack traces to the client
      // We keep the 'details' key for compatibility but sanitize its content in production
      res.status(500).json({
         error: "Upload failed",
         details:
            process.env.NODE_ENV === "production"
               ? "An internal error occurred during the upload process."
               : (error.message || error.toString()),
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
