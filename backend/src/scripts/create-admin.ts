import bcrypt from "bcryptjs";

import { prisma } from "../config/prisma.js";

async function main() {
  const password =
    await bcrypt.hash(
      "123456",
      10
    );

  const user =
    await prisma.user.create({
      data: {
        name: "Administrador",

        email: "admin@helo.com",

        password,

        role: "admin",
      },
    });

  console.log(user);
}

main();