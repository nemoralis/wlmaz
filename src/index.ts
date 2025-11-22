import express from "express";
import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "./auth/passport.ts";
import authRoutes from "./auth/routes.ts";
import uploadRoutes from "./routes/upload.ts";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 3000;

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
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // secure: process.env.NODE_ENV === 'production', // Uncomment when using HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 Day
      httpOnly: true,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err.stack);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});