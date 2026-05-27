import { prisma } from "../config/prisma.js";

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
        "Frete grátis em compras acima de R$ 99,00 para todo o Brasil. Valor e prazo finais são calculados pelo CEP.",

      free_shipping_minimum:
        99,

      moto_uber_enabled:
        true,

      pix_discount_percent:
        10,

      card_interest_free_installments:
        3,

      card_max_installments:
        12,

      business_hours:
        "Segunda a sexta das 08h às 18h",

      exchange_policy:
        "Trocas em até 7 dias",

      ai_rules:
        "Nunca inventar informações. Use as condições comerciais configuradas no sistema e os valores finais retornados pelo cálculo de frete.",
    },
  });

  console.log(
    "StoreConfig criada"
  );
}

main();
