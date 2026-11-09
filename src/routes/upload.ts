/**
 * Upload + file-management endpoints (/upload/status, /upload/config,
 * /upload/titles-exist, /upload):
 *
 * Multipart POST /upload optimizes the image (sharp), builds Commons wikitext,
 * and pushes the result to Commons via OAuth or the local bot-password mode.
 * Replies are strictly typed (api.ts) and never expose credentials.
 */
import path from "path";
import express from "express";
import multer from "multer";
import { type Metadata } from "sharp";
import { config } from "@/config";
import type {
   TitlesExistResponse,
   UploadConfigResponse,
   UploadErrorResponse,
   UploadStatusResponse,
   UploadSuccessResponse,
} from "@/types/api.ts";
import { optimizeImage } from "@/utils/image";
import {
   assertImageWithinLimits,
   createUploadSharp,
   ImageTooLargeError,
} from "@/utils/imageLimits.ts";
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
import {
   buildUploadWikitext,
   parseTitlesExistRequest,
   parseUploadFields,
} from "@/utils/uploadPayload";

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
 * Multer middleware with its own error mapping. Without this, an oversized or
 * wrongly encoded multipart request reaches Express's generic handler and is
 * reported as a 500 instead of a client error.
 */
const uploadSingleFile: express.RequestHandler = (req, res, next) => {
   upload.single("file")(req, res, (error: unknown) => {
      if (!error) {
         next();
         return;
      }

      if (error instanceof multer.MulterError) {
         const tooLarge = error.code === "LIMIT_FILE_SIZE";
         const body: UploadErrorResponse = {
            error: tooLarge ? "File exceeds the 20 MB limit" : "Invalid multipart upload",
            code: error.code,
         };
         res.status(tooLarge ? 413 : 400).json(body);
         return;
      }

      if (error instanceof Error && error.message === "Only image files are allowed") {
         const body: UploadErrorResponse = {
            error: error.message,
            code: "invalid_file_type",
         };
         res.status(400).json(body);
         return;
      }

      next(error);
   });
};

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
router.post(
   "/titles-exist",
   checkUploadsEnabled,
   ensureAuthenticatedOrLocalDev,
   async (req, res) => {
      try {
         const parsed = parseTitlesExistRequest(req.body);
         if (!parsed.ok) {
            res.status(400).json({ error: parsed.error });
            return;
         }
         const titles = parsed.value;

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
   },
);

router.post(
   "/",
   checkUploadsEnabled,
   ensureAuthenticatedOrLocalDev,
   uploadSingleFile,
   async (req, res) => {
      if (!req.file) {
         res.status(400).json({ error: "No file uploaded" });
         return;
      }

      // Stop doing expensive work if the browser went away. The response is
      // only "closed" without ending when the client disconnected; a normal
      // completed response must not abort anything.
      const abortController = new AbortController();
      const handleClientDisconnect = () => {
         if (!res.writableEnded) abortController.abort();
      };
      res.on("close", handleClientDisconnect);

      try {
         if (abortController.signal.aborted) return;

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

         // Security: validate types and lengths before any value reaches
         // sanitization or MediaWiki. Non-string fields (e.g. arrays from
         // parameter pollution) are rejected instead of coerced.
         const parsed = parseUploadFields(req.body);
         if (!parsed.ok) {
            res.status(400).json({ error: parsed.error });
            return;
         }
         const { title, description, license, lat, lon, categories, inventory, capturedAt } =
            parsed.value;

         // Ensure inputs are sanitized to prevent wikitext injection and invalid filenames
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
         const safeCategories = sanitizeWikitext(categories ?? "");
         // Sanitize the inventory so no wikitext can leak into the heritage template.
         const canonicalInventory = getCanonicalId(sanitizeWikitext(inventory ?? ""));
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
         const image = createUploadSharp(fileBuffer);
         let metadata: Metadata;
         try {
            metadata = await image.metadata();
            assertImageWithinLimits(metadata);
         } catch (error) {
            if (
               error instanceof ImageTooLargeError ||
               (error instanceof Error && /exceeds (pixel|channel) limit/.test(error.message))
            ) {
               res.status(413).json({
                  error: "Image exceeds the maximum pixel limit",
                  code: "image_too_large",
               });
               return;
            }
            res.status(400).json({
               error: "Invalid image: file content is not a recognised image format",
               code: "invalid_image",
            });
            return;
         }

         const optimized = await optimizeImage(fileBuffer, metadata);

         // Sharp cannot be cancelled mid-pipeline; everything after it can.
         if (abortController.signal.aborted) return;

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
         if (abortController.signal.aborted) return;

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
            abortController.signal,
         );

         const body: UploadSuccessResponse = {
            filename: result.upload?.filename,
            url:
               result.upload?.imageinfo?.descriptionurl ||
               `https://commons.wikimedia.org/wiki/File:${result.upload?.filename}`,
         };
         res.json(body);
      } catch (error: unknown) {
         // A client that disconnected is not an upload failure: the response is
         // already gone and there is nobody to report to.
         if (abortController.signal.aborted) {
            logger.info("Upload aborted: client disconnected");
            return;
         }

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
      } finally {
         res.off("close", handleClientDisconnect);
      }
   },
);

export default router;
