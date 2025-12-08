import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import uploadRoutes from "./routes/upload.ts";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import hpp from "hpp";
import compression from "compression";

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({
   url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

const limiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100,
   standardHeaders: true,
   legacyHeaders: false,
   message: "Too many requests from this IP, please try again later.",
});

const startServer = async () => {
   await redisClient.connect();

   app.set("trust proxy", 1); // Trust first proxy (required for secure cookies on Vercel/Nginx)

   app.use(
      helmet({
         contentSecurityPolicy: {
            directives: {
               defaultSrc: ["'self'"],
               scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com"],
               imgSrc: [
                  "'self'",
                  "data:",
                  "blob:",
                  "https://*.openstreetmap.org",
                  "https://*.google.com",
                  "https://*.googleapis.com",
                  "https://commons.wikimedia.org",
               ],
               connectSrc: ["'self'", "https://*.googleapis.com"],
               styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
               fontSrc: ["'self'", "https://fonts.gstatic.com"],
            },
         },
         crossOriginEmbedderPolicy: false, // Required for some map resources
      }),
   );
   const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";

   app.use(morgan(morganFormat, {
      skip: (req, _res) => req.url === '/health',
      stream: process.stdout
   }));
   app.use(compression());
   app.use(limiter);
   app.use(hpp()); // Prevent HTTP Parameter Pollution
   app.use(
      cors({
         origin: process.env.CLIENT_URL || "https://wikilovesmonuments.az",
         credentials: true,
      }),
   );

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

   if (process.env.NODE_ENV === "production" || process.env.SERVE_STATIC) {
      const path = await import("path");
      const distPath =
         process.env.NODE_ENV === "production"
            ? "/var/www/wlmaz/dist"
            : path.resolve(__dirname, "../dist");
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
      console.log(`Backend server is running on http://localhost:${PORT}`);
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
