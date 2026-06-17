import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/AppError.js";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error(error);
    }

    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  console.error(
    `${req.method} ${req.originalUrl}`,
    error
  );

  return res.status(500).json({
    error: "Internal server error",
  });
}
