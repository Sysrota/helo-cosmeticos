import bcrypt from "bcryptjs";

import { prisma } from "../config/prisma.js";

async function main() {
  const password =
    await bcrypt.hash(
      "namaste@01",
      10
    );

  const user =
    await prisma.user.create({
      data: {
        name: "Renato Pinheiro",

        email: "renato.sysrota@gmail.com",

        password,

        role: "admin",
      },
    });

  console.log(user);
}

main();