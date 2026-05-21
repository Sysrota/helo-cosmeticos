import { prisma } from "../config/prisma";

async function main() {

  const exists =
    await prisma.storeConfig.findFirst();

  if (exists) {

    console.log(
      "StoreConfig já existe."
    );

    return;
  }

  await prisma.storeConfig.create({
    data: {
      payment_methods:
        `
Pix
Cartão de Crédito
Cartão de Débito
Dinheiro
`,

      shipping_info:
        `
Enviamos para todo Brasil.
Prazo pode variar conforme região.
`,

      business_hours:
        `
Segunda a Sexta:
08h às 18h

Sábado:
08h às 12h
`,

      exchange_policy:
        `
Trocas em até 7 dias após recebimento do produto.
`,
    },
  });

  console.log(
    "StoreConfig criada com sucesso."
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });