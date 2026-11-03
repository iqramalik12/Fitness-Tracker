import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import modular backend routers and services
import authRouter from "./src/server/routers/auth.ts";
import usersRouter from "./src/server/routers/users.ts";
import workoutsRouter from "./src/server/routers/workouts.ts";
import waterRouter from "./src/server/routers/water.ts";
import caloriesRouter from "./src/server/routers/calories.ts";
import notificationsRouter from "./src/server/routers/notifications.ts";
import aiRouter from "./src/server/routers/ai.ts";
import mealsRouter from "./src/server/routers/meals.ts";
import bmiRouter from "./src/server/routers/bmi.ts";
import progressRouter from "./src/server/routers/progress.ts";
import goalsRouter from "./src/server/routers/goals.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 1. Enterprise Security Shield Middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing attacks
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Shield against Clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Mitigate XSS vulnerabilities
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Referrer disclosure restrictions
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // CORS control
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // Clean handling of preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Meal photos need a larger body; this parser runs first so the global 2mb limit is skipped for that route
app.use("/api/meals/analyze-photo", express.json({ limit: "8mb" }));

// Enable JSON parsing with built-in limits to shield against body-payload denial-of-service attacks
app.use(express.json({ limit: "2mb" }));

// API: Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount API routers
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/water", waterRouter);
app.use("/api/calories", caloriesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/bmi", bmiRouter);
app.use("/api/progress", progressRouter);
app.use("/api/goals", goalsRouter);

// Support both route namespaces for maximum backwards compatibility with frontend calls
app.use("/api/ai", aiRouter);
app.use("/api", aiRouter); // Maps /api/coach to aiRouter

// Serve frontend with Vite dev middleware or standard static compiled paths
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Performance optimization: Serve static assets with robust caching policies
    app.use(express.static(distPath, {
      maxAge: "1y",
      etag: true,
      immutable: true,
      setHeaders: (res, pathStr) => {
        // Only cache JS, CSS, fonts, and images. Do not cache the index.html bootloader
        if (pathStr.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    }));

    // SPA fallback handler
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
