import { Request, Response, NextFunction } from "express";

import { AppError } from "../errors/AppError.js";

export function errorHandler(
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
  });
}