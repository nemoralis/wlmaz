import path from "path";
import { fileURLToPath } from "url";
import { RedisStore } from "connect-redis";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import hpp from "hpp";
import morgan from "morgan";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import leaderboardRoutes from "./routes/leaderboard.ts";
import uploadRoutes from "./routes/upload.ts";
import redisClient from "./utils/redis.ts";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
   // redisClient handles its own connection in utils/redis.ts

   app.set("trust proxy", 1);

   const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";

   app.use(
      morgan(morganFormat, {
         skip: (req, _res) => req.url === "/health",
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
               "frame-src": ["'none'"],
               "object-src": ["'none'"],
               "upgrade-insecure-requests": [],
            },
         },
      }),
   );
   app.use(hpp());

   // Rate limiting
   const redisCall = (...args: string[]) => redisClient.sendCommand(args) as any;
   const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      store: new RateLimitRedisStore({ sendCommand: redisCall, prefix: "rl-api:" }),
   });
   const authLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 15,
      message: { error: "Too many login attempts, please try again later." },
      store: new RateLimitRedisStore({ sendCommand: redisCall, prefix: "rl-auth:" }),
   });
   const uploadLimiter = rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      message: { error: "Upload limit reached, please try again later." },
      store: new RateLimitRedisStore({ sendCommand: redisCall, prefix: "rl-upload:" }),
   });

   app.use("/api", apiLimiter);
   app.use("/auth", authLimiter);
   app.use("/upload", uploadLimiter);

   app.use(express.json({ limit: "10kb" }));
   app.use(express.urlencoded({ extended: true, limit: "10kb" }));

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

      // Set CORS headers for every response on these routes
      if (origin) {
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
      const isOAuthRoute =
         req.path === "/auth/login" ||
         req.path === "/auth/callback";

      if (!origin && isOAuthRoute) {
         return next();
      }

      // All other routes with a mismatched or missing Origin are rejected
      if (!origin || origin !== allowedOrigin) {
         res.status(403).json({ error: "Forbidden: cross-origin request rejected" });
         return;
      }

      next();
   };

   app.use(["/api", "/auth", "/upload"], corsMiddleware);

   app.use(
      session({
         name: "wlmaz",

         store: new RedisStore({
            client: redisClient,
            prefix: "wlmaz:",
            ttl: 86400 * 7,
         }),

         secret: process.env.SESSION_SECRET!,
         resave: false,
         saveUninitialized: false,
         cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            // strict in production — prevents CSRF across all cookie-authenticated routes.
            // lax in development so the OAuth callback redirect still works across ports.
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
         },
      }),
   );

   app.use(passport.initialize());
   app.use(passport.session());

   app.use("/auth", authRoutes);
   app.use("/upload", uploadRoutes);
   app.use("/api/leaderboard", leaderboardRoutes);

   app.use(["/api", "/auth", "/upload"], (_req, res) => {
      res.status(404).json({ error: true, message: "Endpoint not found" });
   });

   if (process.env.NODE_ENV === "production") {
      const path = await import("path");
      const distPath = path.resolve(__dirname, "../dist");
      console.log("Serving static files from:", distPath);

      app.use(express.static(distPath));

      app.get(/.*/, (req, res, next) => {
         // Don't catch API/Auth routes
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

   app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      // Fail securely: do not leak internal error details or stack traces to the client in production
      res.status(500).json({
         error: true,
         message:
            process.env.NODE_ENV === "production"
               ? "An internal server error occurred."
               : err.message,
      });
   });

   app.get("/health", async (_req, res) => {
      try {
         await redisClient.ping();
         res.json({ status: "ok", redis: "connected" });
      } catch (_err) {
         res.status(500).json({ status: "error", redis: "disconnected" });
      }
   });

   const server = app.listen(PORT, () => {
      console.log(`Backend server is running on ${PORT}`);
   });

   const gracefulShutdown = async (signal: string) => {
      console.log(`${signal} received: closing HTTP server`);
      server.close(async () => {
         console.log("HTTP server closed");
         if (redisClient.isOpen) {
            await redisClient.quit();
            console.log("Redis client closed");
         }
         process.exit(0);
      });
   };

   process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
   process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

startServer().catch(console.error);
