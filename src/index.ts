import path from "path";
import { fileURLToPath } from "url";
import { RedisStore } from "connect-redis";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import hpp from "hpp";
import morgan from "morgan";
import { createClient } from "redis";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import uploadRoutes from "./routes/upload.ts";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({
   url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

const startServer = async () => {
   await redisClient.connect();

   app.set("trust proxy", process.env.TRUST_PROXY || 1); // Trust first proxy (required for secure cookies behind Nginx)
   const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";

   app.use(
      morgan(morganFormat, {
         skip: (req, _res) => req.url === "/health",
         stream: process.stdout,
      }),
   );
   app.use(hpp()); // Prevent HTTP Parameter Pollution

   app.use(express.json({ limit: "10kb" }));
   app.use(express.urlencoded({ extended: true, limit: "10kb" }));

   // Debug Middleware for Sessions
   app.use((req, _res, next) => {
      if (req.path.startsWith("/auth")) {
         console.log(`[DEBUG] ${req.method} ${req.url} - SID: ${req.sessionID} - Secure: ${req.secure}`);
      }
      next();
   });

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
            secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            sameSite: (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
          //  proxy: true, // Crucial for Express to trust the proxy for secure cookies
         },
      }),
   );

   app.use(passport.initialize());
   app.use(passport.session());

   app.use("/auth", authRoutes);
   app.use("/upload", uploadRoutes);

   if (process.env.NODE_ENV === "production" || process.env.SERVE_STATIC) {
      console.log(process.env.NODE_ENV)
      const path = await import("path");
      const distPath = path.resolve(__dirname, "../dist");
      console.log("Serving static files from:", distPath);

      app.use(express.static(distPath));

      app.get(/.*/, (_req, res) => {
         res.sendFile(path.join(distPath, "index.html"));
      });
   }

   app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(500).json({ error: true, message: err.message });
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
