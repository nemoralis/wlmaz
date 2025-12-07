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
                  "https://upload.wikimedia.org",
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
   app.use(morgan("dev"));
   app.use(compression());
   app.use(limiter);
   app.use(hpp()); // Prevent HTTP Parameter Pollution
   app.use(
      cors({
         origin: process.env.CLIENT_URL || "http://localhost:5173",
         credentials: true,
      }),
   );

   app.use(express.json({ limit: "10kb" })); // Lower limit for JSON (DoS protection)
   app.use(express.urlencoded({ extended: true, limit: "10kb" }));

   app.use(
      session({
         store: new RedisStore({
            client: redisClient,
            prefix: "wlmaz:",
         }),
         secret: process.env.SESSION_SECRET || "dev-secret",
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

   // Serve static files in production
   if (process.env.NODE_ENV === "production" || process.env.SERVE_STATIC) {
      const path = await import("path");
      const distPath = path.resolve(__dirname, "../dist");

      app.use(express.static(distPath));

      app.get("*", (_req, res) => {
         res.sendFile(path.join(distPath, "index.html"));
      });
   }

   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(500).json({ error: true, message: err.message });
   });

   app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
   });
};

startServer().catch(console.error);
