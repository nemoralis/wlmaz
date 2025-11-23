import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import uploadRoutes from "./routes/upload.ts";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { createClient } from "redis";
import { RedisStore } from "connect-redis";

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({
   url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

const startServer = async () => {
   await redisClient.connect();

   app.use(helmet());
   app.use(morgan("dev"));

   app.use(
      cors({
         origin: process.env.CLIENT_URL || "http://localhost:5173",
         credentials: true,
      }),
   );

   app.use(express.json({ limit: "50mb" }));
   app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

   app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error(err);
      res.status(500).json({ error: true, message: err.message });
   });

   app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
   });
};

startServer().catch(console.error);
