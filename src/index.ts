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
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

   app.use(express.json({ limit: "10kb" }));
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
      const distPath = path.resolve(__dirname, "../dist");

      // Load monuments data for SEO
      let monumentsData: any = null;
      try {
         const geojsonPath = path.resolve(__dirname, "../public/monuments.geojson");
         if (fs.existsSync(geojsonPath)) {
            const data = fs.readFileSync(geojsonPath, "utf-8");
            monumentsData = JSON.parse(data);
         }
      } catch (e) {
         console.error("Failed to load monuments.geojson for SEO:", e);
      }

      app.use(express.static(distPath));

      // Dynamic SEO Route for Monuments
      app.get("/monument/:id", (req, res) => {
         const { id } = req.params;
         const indexPath = path.join(distPath, "index.html");

         fs.readFile(indexPath, "utf8", (err, htmlData) => {
            if (err) {
               console.error("Error reading index.html", err);
               res.status(500).send("Server Error");
               return;
            }

            // Default metadata
            let title = "Viki Abidələri Sevir Azərbaycan";
            let description = "Azərbaycandakı abidələrin interaktiv xəritəsi. Viki Abidələri Sevir müsabiqəsi üçün fotoşəkillər yükləyin.";
            let image = "/wlm-az.png";
            let url = `https://vikiabidelerisevir.az/monument/${id}`;

            // Find monument
            if (monumentsData) {
               const monument = monumentsData.features.find(
                  (f: any) => f.properties.inventory === id || f.properties.id === id
               );

               if (monument) {
                  const p = monument.properties;
                  title = `${p.itemLabel} | Viki Abidələri Sevir`;
                  description = `Bu abidə haqqında daha çox öyrənin: ${p.address || "Ünvan yoxdur"}.`;
                  if (p.image) {
                     if (p.image.startsWith("http")) {
                        image = p.image.replace("http://", "https://");
                        if (!image.includes("width=")) {
                           image += "?width=1200";
                        }
                     } else {
                        // Convert commons image title to URL
                        // Example: "File:Foobar.jpg" -> "https://commons.wikimedia.org/wiki/Special:FilePath/Foobar.jpg?width=1200"
                        const filename = p.image.replace("File:", "").replace("Şəkil:", "");
                        image = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1200`;
                     }
                  }
               }
            }

            // Inject Metadata
            const injectedHtml = htmlData
               .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
               .replace(/<meta property="og:title" content=".*" \/>/, `<meta property="og:title" content="${title}" />`)
               .replace(/<meta property="og:description" content=".*" \/>/, `<meta property="og:description" content="${description}" />`)
               .replace(/<meta property="og:image" content=".*" \/>/, `<meta property="og:image" content="${image}" />`)
               .replace(/<meta property="og:url" content=".*" \/>/, `<meta property="og:url" content="${url}" />`)
               .replace(/<meta property="twitter:title" content=".*" \/>/, `<meta property="twitter:title" content="${title}" />`)
               .replace(/<meta property="twitter:description" content=".*" \/>/, `<meta property="twitter:description" content="${description}" />`)
               .replace(/<meta property="twitter:image" content=".*" \/>/, `<meta property="twitter:image" content="${image}" />`);

            res.send(injectedHtml);
         });
      });

      app.get(/.*/, (_req, res) => {
         res.sendFile(path.join(distPath, "index.html"));
      });
   }

   app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(500).json({ error: true, message: err.message });
   });

   app.get("/health", async (_req, res) => {
      try {
         await redisClient.ping();
         res.json({ status: "ok", redis: "connected" });
      } catch (err) {
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
