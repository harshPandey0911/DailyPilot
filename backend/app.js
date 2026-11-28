import express from "express";
import { getEnv } from "./config/env.js";
import avatarRoutes from "./routes/public-routes/avatarRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  const { corsOrigin } = getEnv();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (corsOrigin.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: "3mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "dailypilot-backend" });
  });

  app.use("/api/avatar", avatarRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found." });
  });

  app.use(errorHandler);
  return app;
}
