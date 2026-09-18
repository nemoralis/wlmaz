import path from "path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "url";
import { RedisStore } from "connect-redis";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import leaderboardRoutes from "./routes/leaderboard.ts";
import uploadRoutes from "./routes/upload.ts";
import { logger } from "./utils/logger.ts";
import redisClient from "./utils/redis.ts";
import sharp from "sharp";

// Limit libvips thread pool per worker.  In PM2 cluster mode each worker is a
// separate process with its own thread pool.  With 2 workers on 2 vCPUs,
// concurrency(2) gives each worker 2 Sharp threads (4 total), matching the
// available cores without oversubscription.
sharp.concurrency(2);

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Local MediaWiki dev mode: no OAuth, no Redis — everything runs in-memory.
const isDevUploadMode =
   process.env.MEDIAWIKI_DEV_MODE === "true" && process.env.NODE_ENV !== "production";

const app = express();
const PORT = process.env.PORT || 3000;

// Fail fast on startup if critical secrets are missing, before any middleware
// or route handlers are registered.
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
   throw new Error("SESSION_SECRET must be set and at least 32 characters long");
}

const startServer = async () => {
   // redisClient handles its own connection in utils/redis.ts

   app.set("trust proxy", 1);

   // ---------------------------------------------------------------------------
   // 1. Global middleware — runs on EVERY request (cheap, security-relevant)
   // ---------------------------------------------------------------------------
    const morganFormat = process.env.NODE_ENV === "production" ? "tiny" : "dev";

   app.use(
      morgan(morganFormat, {
         skip: (req, _res) => req.url === "/health" || req.url.startsWith("/assets/"),
         stream: process.stdout,
      }),
   );
   app.use(
      helmet({
         contentSecurityPolicy: {
            directives: {
               "default-src": ["'self'"],
               "script-src": ["'self'"],
               "style-src": ["'self'", "'unsafe-inline'"],
               "img-src": [
                  "'self'",
                  "data:",
                  "blob:",
                  "*.openstreetmap.org",
                  "*.wikimedia.org",
                  "tiles.gomap.az",
                  "mt0.google.com",
                  "wikilovesmonuments.az",
               ],
               "connect-src": ["'self'", "*.wikimedia.org"],
               "font-src": ["'self'"],
               // Explicit worker-src so tightening default-src never silently breaks
               // the data.worker.ts Web Worker.
               "worker-src": ["'self'"],
               "frame-src": ["'none'"],
               "object-src": ["'none'"],
               "base-uri": ["'self'"],
               "form-action": ["'self'"],
               "upgrade-insecure-requests": [],
            },
         },
         xPermittedCrossDomainPolicies: { permittedPolicies: "none" },
      }),
   );

   // Helmet 8.x removed its built-in permissionsPolicy handler, so we set
   // the Permissions-Policy header manually.  This prevents the frontend from
   // accessing browser features the app doesn't need.
   app.use((_req, res, next) => {
      // Harden Permissions-Policy to restrict unused browser features (Defense in Depth)
      res.setHeader(
         "Permissions-Policy",
         "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), " +
            "fullscreen=(), geolocation=(self), gyroscope=(), interest-cohort=(), magnetometer=(), " +
            "microphone=(), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), " +
            "sync-xhr=(), usb=(), xr-spatial-tracking()",
      );
      next();
   });

   // ---------------------------------------------------------------------------
   // 2. Health check — no session/auth/CORS needed; registered early so the SPA
   //    catch-all below cannot intercept it.
   // ---------------------------------------------------------------------------
   app.get("/health", async (req, res) => {
      const ip = req.ip ?? "";
      const isLocal = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

      if (!isLocal) {
         res.status(404).end();
         return;
      }

      if (isDevUploadMode) {
         res.json({ status: "ok", mode: "local-dev", redis: "skipped" });
         return;
      }

      try {
         await redisClient.ping();
         res.json({ status: "ok", redis: "connected" });
      } catch (_err) {
         res.status(500).json({ status: "error", redis: "disconnected" });
      }
   });

   // ---------------------------------------------------------------------------
   // 3. Static assets — served BEFORE session/passport to avoid unnecessary Redis
   //    operations on every hashed JS/CSS/image request.
   // ---------------------------------------------------------------------------
   if (process.env.NODE_ENV === "production") {
      const distPath = path.resolve(__dirname, "../dist");
      logger.info("Serving static files from:", distPath);

      // Static files (hashed assets, images, monuments.pbf, etc.)
      // express.static only serves files that exist and does NOT call next() for
      // matched requests, so matched assets never touch session/auth middleware.
      app.use(express.static(distPath));

      // Prerendered static pages written by scripts/prerender.ts.
      const staticPageFiles: Record<string, string> = {
         "/stats": "stats.html",
         "/leaderboard": "leaderboard.html",
         "/table": "table.html",
         "/about": "about.html",
      };
      app.get(Object.keys(staticPageFiles), (req, res) => {
         const file = path.join(distPath, staticPageFiles[req.path]);
         if (existsSync(file)) {
            return res.sendFile(file);
         }
         // Fall through to SPA fallback
         res.sendFile(path.join(distPath, "index.html"));
      });

      // Serve prerendered monument pages (written by scripts/prerender.ts) so
      // crawlers receive unique, static HTML for every monument URL.
      app.get("/monument/:id", (req, res, next) => {
         const monumentDir = path.join(distPath, "monument");
         const file = path.resolve(monumentDir, `${req.params.id}.html`);
         if (file.startsWith(`${monumentDir}/`) && existsSync(file)) {
            return res.sendFile(file);
         }
         next();
      });

      // SPA catch-all — serves index.html for client-side routes.  Skips API,
      // auth, and upload paths so they continue to session/passport below.
      app.get(/.*/, (req, res, next) => {
         if (
            req.url.startsWith("/auth") ||
            req.url.startsWith("/upload") ||
            req.url.startsWith("/api")
         ) {
            return next();
         }
         res.sendFile(path.join(distPath, "index.html"));
      });
   }

   // ---------------------------------------------------------------------------
   // 4. API-scoped middleware — only runs for /api, /auth, /upload requests.
   //    Static file requests that matched express.static above never reach here.
   // ---------------------------------------------------------------------------

   // Rate limiting — Redis-backed in production, in-memory (or skipped) in dev mode.
   const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      // 200 requests / 15 min is ample for the SPA; the original 1000 made
      // scraping and enumeration trivially easy.
      limit: 200,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(isDevUploadMode ? {} : { store: new RateLimitRedisStore({ sendCommand: (...args: any[]) => redisClient.sendCommand(args) as any, prefix: "rl-api:" }) }),
   });
   const authLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 15,
      message: { error: "Too many login attempts, please try again later." },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(isDevUploadMode ? {} : { store: new RateLimitRedisStore({ sendCommand: (...args: any[]) => redisClient.sendCommand(args) as any, prefix: "rl-auth:" }) }),
   });
   const uploadLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 500,
      message: { error: "Upload limit reached, please try again later." },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(isDevUploadMode ? {} : { store: new RateLimitRedisStore({ sendCommand: (...args: any[]) => redisClient.sendCommand(args) as any, prefix: "rl-upload:" }) }),
   });

   const apiPaths = ["/api", "/auth", "/upload"];

   app.use("/api", apiLimiter);
   app.use("/auth", authLimiter);
   app.use("/upload", uploadLimiter);

   // Body parsers scoped to API routes only — static files have no request body.
   app.use(apiPaths, express.json({ limit: "10kb" }));
   app.use(apiPaths, express.urlencoded({ extended: false, limit: "10kb" }));
   // HPP must be used after body-parsers to protect the request body.
   app.use(apiPaths, hpp());

   // ---------------------------------------------------------------------------
   // CORS + Origin Validation
   // Restrict all API / auth / upload routes to requests originating from our
   // own frontend (CLIENT_URL).  OAuth redirect flows (/auth/login, /auth/callback)
   // are browser navigations — they carry no Origin header — so they are allowed
   // through to keep the OAuth handshake working.
   // ---------------------------------------------------------------------------
   const allowedOrigin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

   const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers["origin"] as string | undefined;

      // Always set Vary: Origin to prevent cache poisoning.
      res.setHeader("Vary", "Origin");

      // Set CORS headers only if the origin matches our allowed domain.
      if (origin === allowedOrigin) {
         res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
         res.setHeader("Access-Control-Allow-Credentials", "true");
         res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
         res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
      }

      // Answer preflight immediately
      if (req.method === "OPTIONS") {
         res.sendStatus(204);
         return;
      }

      // OAuth redirect routes have no Origin — let them through
      const isOAuthRoute = req.path === "/auth/login" || req.path === "/auth/callback";

      if (!origin && isOAuthRoute) {
         return next();
      }

      // All other routes with a mismatched Origin are rejected.
      // If the Origin header is missing, it's either a same-origin request
      // (e.g. proxied by Vite/Nginx) or a direct browser navigation.
      if (origin && origin !== allowedOrigin) {
         res.status(403).json({ error: "Forbidden: cross-origin request rejected" });
         return;
      }

      next();
   };

   app.use(apiPaths, corsMiddleware);

   // Session — scoped to API routes only.  Static file requests never reach this
   // middleware, eliminating unnecessary Redis GET operations on every asset.
   app.use(
      apiPaths,
      session({
         name: "wlmaz",

         // In dev mode skip the Redis session store (no Redis required).
         ...(isDevUploadMode
            ? {}
            : {
                 store: new RedisStore({
                    client: redisClient,
                    prefix: "wlmaz:",
                    ttl: 86400 * 7,
                 }),
              }),

         secret: SESSION_SECRET,
         resave: false,
         saveUninitialized: false,
         cookie: {
            secure: "auto",
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            // lax — required for OAuth callback redirects to send the session cookie
            sameSite: "lax",
         },
      }),
   );

   app.use(apiPaths, passport.initialize());
   app.use(apiPaths, passport.session());

   // ---------------------------------------------------------------------------
   // 5. API routes
   // ---------------------------------------------------------------------------
   app.use("/auth", authRoutes);
   app.use("/upload", uploadRoutes);
   app.use("/api/leaderboard", leaderboardRoutes);

   app.use(["/api", "/auth", "/upload"], (_req, res) => {
      res.status(404).json({ error: true, message: "Endpoint not found" });
   });

   // ---------------------------------------------------------------------------
   // 6. Error handler — must be last
   // ---------------------------------------------------------------------------
   app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error(err);
      // Fail securely: do not leak internal error details or stack traces to the client in production
      res.status(500).json({
         error: true,
         message:
            process.env.NODE_ENV === "production"
               ? "An internal server error occurred."
               : err.message,
      });
   });

   const server = app.listen(PORT, () => {
      logger.info(`Backend server is running on ${PORT}`);
   });

   const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received: closing HTTP server`);
      server.close(async () => {
         logger.info("HTTP server closed");
         if (redisClient.isOpen) {
            await redisClient.quit();
            logger.info("Redis client closed");
         }
         process.exit(0);
      });
   };

   process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
   process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

startServer().catch((err) => logger.error(err));
