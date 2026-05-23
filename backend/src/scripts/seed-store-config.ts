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
        "Frete calculado conforme CEP",

      business_hours:
        "Segunda a sexta das 08h às 18h",

      exchange_policy:
        "Trocas em até 7 dias",

      ai_rules:
        "Nunca inventar informações",
    },
  });

  console.log(
    "StoreConfig criada"
  );
}

main();