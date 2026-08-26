import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { errorBody } from "../utils/response";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorBody("NOT_FOUND", `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const first = err.errors[0];
    res
      .status(422)
      .json(
        errorBody(
          "VALIDATION_ERROR",
          first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request payload",
          err.flatten()
        )
      );
    return;
  }

  interface AppLikeError {
    statusCode?: number;
    code?: string;
    message?: string;
    details?: unknown;
    type?: string;
  }

  const appErr = err as AppLikeError;
  if (appErr && typeof appErr === "object" && appErr.type === "entity.parse.failed") {
    res.status(400).json(errorBody("INVALID_JSON", "Request body is not valid JSON"));
    return;
  }
  if (appErr && typeof appErr === "object" && typeof appErr.statusCode === "number" && appErr.code) {
    res
      .status(appErr.statusCode)
      .json(errorBody(appErr.code, appErr.message ?? "Request failed", appErr.details));
    return;
  }

  // eslint-disable-next-line no-console
  console.error("[unhandled error]", err);

  const status = 500;
  const message =
    err instanceof Error && env.NODE_ENV !== "production" ? err.message : "Internal server error";
  res.status(status).json(errorBody("INTERNAL_ERROR", message));
}
