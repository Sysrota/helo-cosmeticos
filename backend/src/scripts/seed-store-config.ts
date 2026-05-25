import { prisma } from "@/config/prisma";

async function main() {

  const exists =
    
   await prisma.storeConfig.deleteMany();  

  // await prisma.storeConfig.findFirst();

  // if (exists) {
  //   return;
  // }

  await prisma.storeConfig.create({
    data: {
      payment_methods: [
        {
          id: "pix",
          label: "Pix",
          enabled: true,
        },

        {
          id: "credit_card",
          label: "Cartão de Crédito",
          enabled: true,
        },

        {
          id: "debit_card",
          label: "Cartão de Débito",
          enabled: true,      
        },

        {
          id: "boleto",
          label: "Boleto",
          enabled: false,
        },

        {
          id: "dinheiro",
          label: "Dinheiro",
          enabled: true,
        },
      ],

      shipping_methods: [
        {
          id: "correios",
          label: "Correios",
        },

        {
          id: "jadlog",
          label: "Jadlog",
        },
      ],

      shipping_info:
        "Frete grátis para Goiânia e região metropolitana. Para demais localidades, abatimento de até R$ 25,00 no frete; valor e prazo finais são calculados pelo CEP.",

      business_hours:
        "Segunda a sexta das 08h às 18h",

      exchange_policy:
        "Trocas em até 7 dias",

      ai_rules:
        "Nunca inventar informações. PIX com 10% de desconto no checkout. Cartão em até 3x sem juros ou até 12x com juros, conforme opções exibidas no checkout.",
    },
  });

  console.log(
    "StoreConfig criada"
  );
}

main();
