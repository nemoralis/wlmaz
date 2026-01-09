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

   app.set("trust proxy", 1);
   const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";

   app.use(
      morgan(morganFormat, {
         skip: (req, _res) => req.url === "/health",
         stream: process.stdout,
      }),
   );
   app.use(hpp());

   app.use(express.json({ limit: "10kb" }));
   app.use(express.urlencoded({ extended: true, limit: "10kb" }));

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
            sameSite: "lax",
         },
      }),
   );

   app.use(passport.initialize());
   app.use(passport.session());

   app.use("/auth", authRoutes);
   app.use("/upload", uploadRoutes);

   if (process.env.NODE_ENV === "production") {
      const path = await import("path");
      const distPath = path.resolve(__dirname, "../dist");
      console.log("Serving static files from:", distPath);

      app.use(express.static(distPath));

      app.get(/.*/, (req, res, next) => {
         // Don't catch API/Auth routes
         if (req.url.startsWith("/auth") || req.url.startsWith("/upload")) {
            return next();
         }
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
