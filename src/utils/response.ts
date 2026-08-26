import { Response } from "express";
import type { ApiError, ApiSuccess, Paginated, PaginationMeta } from "../types/common.types";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function ok<T>(res: Response, data: T, status = 200): Response<ApiSuccess<T>> {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response<ApiSuccess<T>> {
  return ok(res, data, 201);
}

export function paginated<T>(res: Response, items: T[], pagination: PaginationMeta): Response<ApiSuccess<Paginated<T>>> {
  return ok(res, { items, pagination });
}

export function errorBody(code: string, message: string, details?: unknown): ApiError {
  return { success: false, error: details === undefined ? { code, message } : { code, message, details } };
}
