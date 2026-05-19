import { Request, Response } from "express";

import { loginSchema } from "./auth.validators.js";

import { loginService } from "./auth.service.js";

export async function loginController(
  req: Request,
  res: Response
) {
  const parsed =
    loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const result =
    await loginService(parsed.data);

  return res.json(result);
}