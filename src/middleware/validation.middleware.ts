import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { errorBody } from "../utils/response";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) res.locals.query = schemas.query.parse(req.query);
      if (schemas.params) res.locals.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
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
      next(err);
    }
  };
}
