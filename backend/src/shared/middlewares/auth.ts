import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import { AppError } from "../errors/AppError.js";

interface TokenPayload {
  id: number;
  role: string;
}

export function auth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    throw new AppError(
      "Token não informado",
      401
    );
  }

  const [, token] =
    authHeader.split(" ");

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as TokenPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch {
    throw new AppError(
      "Token inválido",
      401
    );
  }
}