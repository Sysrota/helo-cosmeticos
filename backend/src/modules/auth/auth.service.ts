import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/prisma.js";

import { AppError } from "../../shared/errors/AppError.js";

interface LoginDTO {
  email: string;
  password: string;
}

export async function loginService(
  data: LoginDTO
) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new AppError(
      "Email ou senha inválidos",
      401
    );
  }

  const passwordMatch =
    await bcrypt.compare(
      data.password,
      user.password
    );

  if (!passwordMatch) {
    throw new AppError(
      "Email ou senha inválidos",
      401
    );
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },

    process.env.JWT_SECRET!,

    {
      expiresIn: "7d",
    }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },

    token,
  };
}