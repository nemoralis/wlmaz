import path from "path";
import express from "express";
import multer from "multer";
import sharp, { type Metadata } from "sharp";
import { config } from "@/config";
import type {
   TitlesExistResponse,
   UploadConfigResponse,
   UploadErrorResponse,
   UploadStatusResponse,
   UploadSuccessResponse,
} from "@/types/api.ts";
import { optimizeImage } from "@/utils/image";
import { logger } from "@/utils/logger";
import {
   checkFileExistence,
   CommonsUploadError,
   uploadFile as uploadToCommons,
} from "@/utils/mediawiki";
import {
   getBotPasswordCredentials,
   getUploadClientConfig,
   isLocalMediaWikiEnabled,
   resolveMediaWikiTarget,
} from "@/utils/mediawikiConfig";
import { getCanonicalId } from "@/utils/monumentFormatters";
import { mapLicenseTemplate, sanitizeFilename, sanitizeWikitext } from "@/utils/sanitize";
import { buildUploadWikitext } from "@/utils/wikitext";

const router = express.Router();

// Memory storage — keeps the upload buffer in-process, avoiding disk write/read
// and the periodic temp-file cleanup that disk storage required.
const upload = multer({
   storage: multer.memoryStorage(),
   defParamCharset: "utf8",
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
 * Middleware to ensure uploads are permitted for this request.
 *
 * In normal (production) operation this requires an authenticated Commons OAuth
 * user — preventing unauthenticated users from consuming server resources/disk.
 *
 * In LOCAL MediaWiki dev mode (development only, never in production) the upload
 * is authenticated server-side with a Bot Password, so no user session is
 * required and this middleware lets the request through without a logged-in user.
 * The upload route resolves the dev target and authenticates itself.
 */
const ensureAuthenticatedOrLocalDev = (
   req: express.Request,
   res: express.Response,
   next: express.NextFunction,
) => {
   if (req.isAuthenticated() && req.user) {
      return next();
   }
   if (isLocalMediaWikiEnabled()) {
      // Local MediaWiki upload mode authenticates server-side; no session needed.
      return next();
   }
   res.status(401).json({ error: "Unauthorized" });
};

/**
 * Middleware to check if uploads are enabled globally.
 */
const checkUploadsEnabled = (
   _req: express.Request,
   res: express.Response,
   next: express.NextFunction,
) => {
   if (!config.uploadsEnabled) {
      res.status(403).json({ error: "Uploads are currently disabled." });
      return;
   }
   next();
};

// Status Check Endpoint
router.get("/status", (_req, res) => {
   const body: UploadStatusResponse = { enabled: config.uploadsEnabled };
   res.json(body);
});

/**
 * Server-driven upload configuration for the frontend.
 *
 * Exposes ONLY safe, non-sensitive information the UI needs. The bot password
 * and username are never included — they are strictly server-side. In production
 * this always reports a non-local (Commons) target and never the dev mode.
 */
router.get("/config", (_req, res) => {
   const body: UploadConfigResponse = getUploadClientConfig();
   res.json(body);
});

/**
 * Reports which of the requested upload titles already exist on Commons, so the
 * client can re-number its batch titles to the first free slots before uploading.
 * Uses the same MediaWiki target/authentication as the actual upload — in dev
 * mode this hits the local MediaWiki instance with the bot session.
 * Uses JSON POST so long filenames never hit query-string/header limits.
 */
router.post("/titles-exist", ensureAuthenticatedOrLocalDev, async (req, res) => {
   try {
      const raw = req.body?.titles;
      if (!Array.isArray(raw)) {
         res.status(400).json({ error: "Missing titles parameter" });
         return;
      }

      const titles = raw
         .map((t) => String(t ?? "").trim())
         .filter(Boolean)
         .slice(0, 50);

      if (titles.length === 0) {
         res.status(400).json({ error: "Missing titles parameter" });
         return;
      }

      if (titles.some((t) => t.length > 255)) {
         res.status(400).json({ error: "Title too long" });
         return;
      }

      const existing = await checkFileExistence(titles);
      logger.info(
         "[titles-exist] checked=%d existing=%d first=%s",
         titles.length,
         existing.length,
         titles[0],
      );
      const body: TitlesExistResponse = { existing };
      res.json(body);
   } catch (error) {
      logger.error("Titles existence check failed:", error);
      res.status(502).json({ error: "Failed to check title availability" });
   }
});

router.post(
   "/",
   checkUploadsEnabled,
   ensureAuthenticatedOrLocalDev,
   upload.single("file"),
   async (req, res) => {
      if (!req.file) {
         res.status(400).json({ error: "No file uploaded" });
         return;
      }

      try {
         // Resolve the upload target / auth mode once per request. In production
         // this is always Commons OAuth; in local dev mode it is the configured
         // local MediaWiki bot session (server-side authentication).
         const target = resolveMediaWikiTarget();
         const isLocalDev = isLocalMediaWikiEnabled();

         // In local dev mode there is no logged-in user (bot-password mode). Use
         // the configured dev username for the wikitext author line; the bot
         // password itself is never used here.
         let authorUsername =
            req.user?.username || (isLocalDev ? getBotPasswordCredentials().username : "");

         // In production, an upload requires an authenticated user.
         if (!isLocalDev && !req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
         }

         let { title, description, license, lat, lon, categories, inventory, capturedAt } =
            req.body;

         // Security: Explicit type check — rejects non-string values (e.g. objects from
         // parameter pollution) that a truthiness check would incorrectly accept.
         if (typeof title !== "string" || typeof description !== "string") {
            res.status(400).json({ error: "Missing title or description" });
            return;
         }

         // Security: Validate input lengths to prevent resource abuse and comply with upstream limits.
         // We cast to String to handle unexpected types and avoid crashing on undefined/null.
         if (
            String(title).length > 255 ||
            String(description).length > 2000 ||
            (categories && String(categories).length > 255) ||
            (inventory && String(inventory).length > 255) ||
            (capturedAt && String(capturedAt).length > 20)
         ) {
            res.status(400).json({ error: "Input too long" });
            return;
         }

         // Ensure inputs are strings and sanitize to prevent wikitext injection and invalid filenames
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
         // Sanitize the inventory so no wikitext can leak into the heritage template.
         const canonicalInventory = getCanonicalId(sanitizeWikitext(inventory));
         // Sanitize the username even though it comes from a trusted source
         // (OAuth session or dev-only bot config). Wikimedia usernames should
         // never contain wikitext-special characters, but being defensive here
         // prevents template corruption if that assumption breaks.
         const safeUsername = sanitizeWikitext(authorUsername).replace(/\|/g, "");

         // Assemble wikitext from sanitized inputs (pure function, no side effects).
         const wikitext = buildUploadWikitext({
            description: safeDescription,
            licenseTemplate: mapLicenseTemplate(license),
            username: safeUsername,
            capturedAt,
            lat,
            lon,
            categories: safeCategories,
            inventory: canonicalInventory,
         });

         // --- Image validation + optimization (single Sharp pipeline) --------
         // The buffer comes directly from multer's memoryStorage — no disk read.
         // sharp.metadata() reads only the image header (fast).  Passing the
         // result into optimizeImage avoids a second header decode.
         const fileBuffer = req.file.buffer;
         const image = sharp(fileBuffer);
         let metadata: Metadata;
         try {
            metadata = await image.metadata();
         } catch {
            res.status(400).json({
               error: "Invalid image: file content is not a recognised image format",
            });
            return;
         }

         const optimized = await optimizeImage(fileBuffer, metadata);

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

         // Upload (OAuth Commons or local bot-password) using the optimized buffer.
         const result = await uploadToCommons(
            req.user ?? null,
            {
               name: finalFilename,
               buffer: finalBuffer,
               mimetype: finalMime,
            },
            {
               text: wikitext,
               comment: `Uploaded via wikilovesmonuments.az`,
            },
            target,
         );

         const body: UploadSuccessResponse = {
            filename: result.upload?.filename,
            url:
               result.upload?.imageinfo?.descriptionurl ||
               `https://commons.wikimedia.org/wiki/File:${result.upload?.filename}`,
         };
         res.json(body);
      } catch (error: unknown) {
         // Commons rejections carry a user-facing code/info; surface them so the
         // client can map them to a helpful message. Everything else is an
         // internal error and stays generic to avoid leaking stack traces.
         if (error instanceof CommonsUploadError) {
            logger.error("Commons upload rejected:", {
               code: error.code,
               info: error.info,
            });
            const body: UploadErrorResponse = {
               error:
                  error.code === "http_error"
                     ? "Commons upload failed"
                     : "Commons rejected the upload",
               code: error.code,
               details: (error.info || "").slice(0, 500),
            };
            res.status(error.httpStatus || 422).json(body);
            return;
         }

         logger.error("Upload error:", error);
         // Fail securely: do not leak internal error details or stack traces to the client
         // We keep the 'details' key for compatibility but sanitize its content in production
         const message = error instanceof Error ? error.message : String(error);
         res.status(500).json({
            error: "Upload failed",
            details: config.isProduction
               ? "An internal error occurred during the upload process."
               : message,
         });
      }
   },
);

export default router;
