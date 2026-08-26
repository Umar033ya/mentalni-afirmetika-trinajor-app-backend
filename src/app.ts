import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { appConfig } from "./config/app.config";
import { globalLimiter } from "./middleware/rate-limit.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRouter, apiPrefix } from "./routes";
import { getCachedDbStatus } from "./utils/db-status";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.corsOrigins === "*" ? true : appConfig.corsOrigins,
      credentials: false
    })
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(express.urlencoded({ extended: false }));

  if (env.NODE_ENV === "production") {
    app.use(globalLimiter);
  }

  app.get("/health", async (_req, res) => {
    const dbStatus = await getCachedDbStatus();
    res.status(200).json({
      status: "ok",
      database: dbStatus.connected ? "connected" : "disconnected"
    });
  });

  app.use(apiPrefix(), apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
