import OpenAI
  from "openai";

import {
  prisma,
} from "../../../config/prisma.js";

import {
  searchProductsTool,
} from "../tools/search-products.tool.js";

import {
  createAiCartTool,
} from "../tools/create-ai-cart.tool.js";

import {
  addCartItemTool,
} from "../tools/add-cart-item.tool.js";

import {
  updateCartItemTool,
} from "../tools/update-cart-item.tool.js";

import {
  calculateShippingTool,
} from "../tools/calculate-shipping.tool.js";

import {
  generateCheckoutLinkTool,
} from "../tools/generate-checkout-link.tool.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

interface Props {

  conversationId:
    number;

  messages:
    any[];
}

export async function executeAiAgent({
  conversationId,
  messages,
}: Props) {

  // =====================
  // CONVERSATION
  // =====================

  const conversation =
    await prisma.conversation
      .findUnique({

        where: {
          id:
            conversationId,
        },
      });

  if (!conversation) {

    throw new Error(
      "Conversa não encontrada"
    );
  }

  // =====================
  // MEMORY
  // =====================

  const memory =
    conversation.ai_summary ||
    "Sem memória ainda.";

  const cart =
    conversation.cart_json

      ? JSON.stringify(
          conversation.cart_json,
          null,
          2
        )

      : "Carrinho vazio";

  const commercialPolicy =
    await getCommercialPolicy();
  const freeShippingMinimum =
    commercialPolicy.free_shipping_minimum
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
  const cardConditions =
    `até ${commercialPolicy.card_interest_free_installments}x sem juros ou até ${commercialPolicy.card_max_installments}x com juros no cartão`;

  // =====================
  // PROMPT
  // =====================

  const systemPrompt = `
Você é a Helô, atendente virtual da Helo Cosméticos.

OBJETIVO:
- vender
- recomendar produtos
- montar kits
- adicionar produtos no carrinho
- calcular frete
- enviar checkout
- tirar duvidas sobre os produtos

REGRAS:
- Ao iniciar uma conversa verifique se já houve contato e continue apartir dali
- Nunca invente produtos
- Nunca invente preços
- Nunca invente links
- Quando o cliente pedir foto ou imagem de um produto, use search_products se precisar localizar o produto; se o produto tiver image ou Foto cadastrada, a imagem sera enviada pelo sistema como midia
- Nunca escreva a URL da foto, image, Foto cadastrada ou link de produto quando o cliente pedir foto; responda de forma natural e deixe o sistema enviar somente a imagem
- Ao recomendar um produto, use as indications retornadas pela busca apenas como necessidades relacionadas cadastradas para aquele produto; não transforme tags em promessa de resultado
- Sempre use as tools
- Para adicionar um produto ao carrinho, use apenas o ID real exibido em PRODUTOS ENCONTRADOS ou retornado por search_products; nunca estime ou invente productId
- Se add_cart_item retornar product_not_found, pesquise novamente com search_products e só ofereça/adicione produtos reais encontrados
- Seja humana
- Seja elegante
- Seja especialista em cosméticos

IMPORTANTE:
- O cliente paga no checkout
- Nunca gere PIX diretamente
- Nunca gere resposta vazia
- Sempre responda o cliente
- Sempre finalize naturalmente
- Condições vigentes: pagamento via PIX tem ${commercialPolicy.pix_discount_percent}% de desconto no checkout
- Condições vigentes: cartão possui ${cardConditions}, sujeito às opções apresentadas no checkout
- Condições vigentes: o frete é grátis em compras acima de ${freeShippingMinimum}, para qualquer localidade atendida
- Condições vigentes: ${commercialPolicy.moto_uber_enabled ? "Moto Uber pode aparecer para Goiânia e região metropolitana; nessa opção, o cliente paga a corrida diretamente no envio e o valor não é cobrado no checkout" : "Moto Uber não está disponível"}
- Ao falar de cartão, informe exatamente: "${cardConditions}"
- Para prazo e valor final de entrega, calcule o frete pelo CEP usando a tool e informe somente os valores finais retornados em options.price
- Quando houver mais de uma opção de frete, apresente primeiro a opção mais barata e informe que ela é a opção mais econômica; depois apresente as demais opções, sempre na ordem do menor para o maior valor final
- Se calculate_shipping retornar policy "free_shipping_threshold", diga que a compra atingiu o frete grátis acima de ${freeShippingMinimum}; informe os serviços e prazos retornados, todos sem custo
- Se calculate_shipping retornar policy "calculated_shipping", informe os serviços, prazos e valores finais retornados pela consulta
- Se uma opção "Moto Uber - pagamento pelo cliente" estiver em options, explique que é entrega local rápida e que o custo da corrida é pago pelo cliente diretamente no envio; nunca diga que essa opção é grátis
- Se calculate_shipping retornar policy "moto_uber_available", informe apenas a opção de Moto Uber disponível e a cobrança direta ao cliente, pois a cotação das transportadoras não ficou disponível
- Se calculate_shipping retornar policy "shipping_unavailable", diga apenas que a consulta não ficou disponível naquele momento e que o frete poderá ser calculado no checkout; não invente preço nem prazo
- Se calculate_shipping retornar policy "invalid_zipcode", avise que não localizou o CEP informado e peça para o cliente conferir e enviar um CEP válido com 8 números
- Se calculate_shipping retornar policy "address_unavailable", avise que a consulta de CEP está temporariamente indisponível e ofereça tentar novamente ou calcular no checkout; não invente endereço, preço ou prazo
- Se o cliente pedir "finalizar compra", "enviar link", "gerar checkout" ou equivalente e o carrinho já tiver produtos, use generate_checkout_link diretamente; não execute calculate_shipping sem um pedido explícito de cotação de frete
- Use add_cart_item somente quando o cliente pedir para acrescentar unidades ou incluir um novo produto
- Se o cliente pedir para trocar, corrigir, definir ou reduzir a quantidade de um produto que já está no carrinho, use update_cart_item; a quantidade informada é o total desejado, não um acréscimo
- Para remover um produto do carrinho, use update_cart_item com quantity 0
- Se um link de checkout já foi enviado e o cliente alterar o carrinho, atualize o item e gere o link novamente para sincronizar o pedido pendente

MEMÓRIA:
${memory}

CARRINHO:
${cart}

LINK DE CHECKOUT ATUAL:
${conversation.checkout_url || "Nenhum link enviado ainda."}
`;

  // =====================
  // HISTORY
  // =====================

  let messagesHistory: any[] = [

    {
      role:
        "system",

      content:
        systemPrompt,
    },

    ...messages,
  ];

  // =====================
  // LOOP
  // =====================

  for (
    let step = 0;
    step < 6;
    step++
  ) {

    const response =
      await openai.chat.completions
        .create({

          model:
            "gpt-4.1-mini",

          temperature:
            0.7,

          messages:
            messagesHistory,

          tools: [

            // =====================
            // SEARCH PRODUCTS
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "search_products",

                description:
                  "Busca produtos reais",

                parameters: {

                  type:
                    "object",

                  properties: {

                    query: {

                      type:
                        "string",
                    },
                  },

                  required: [
                    "query",
                  ],
                },
              },
            },

            // =====================
            // CREATE CART
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "create_cart",

                description:
                  "Cria carrinho",

                parameters: {

                  type:
                    "object",

                  properties: {},
                },
              },
            },

            // =====================
            // ADD ITEM
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "add_cart_item",

                description:
                  "Adiciona um produto ativo ao carrinho. productId deve ser exatamente um ID retornado pelo catálogo ou pela busca; nunca invente IDs.",

                parameters: {

                  type:
                    "object",

                  properties: {

                    productId: {
                      type:
                        "number",
                    },

                    quantity: {
                      type:
                        "number",
                    },
                  },

                  required: [
                    "productId",
                  ],
                },
              },
            },

            // =====================
            // UPDATE ITEM
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "update_cart_item",

                description:
                  "Define a quantidade total de um produto que já está no carrinho ou o remove usando quantidade zero",

                parameters: {

                  type:
                    "object",

                  properties: {

                    productId: {
                      type:
                        "number",
                    },

                    quantity: {
                      type:
                        "number",

                      minimum:
                        0,
                    },
                  },

                  required: [
                    "productId",
                    "quantity",
                  ],
                },
              },
            },

            // =====================
            // SHIPPING
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "calculate_shipping",

                description:
                  "Calcula frete",

                parameters: {

                  type:
                    "object",

                  properties: {

                    cep: {
                      type:
                        "string",
                    },
                  },

                  required: [
                    "cep",
                  ],
                },
              },
            },

            // =====================
            // CHECKOUT
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "generate_checkout_link",

                description:
                  "Gera checkout oficial",

                parameters: {

                  type:
                    "object",

                  properties: {},
                },
              },
            },
          ],
        });

    const message =
      response.choices[0]
        .message;

    // =====================
    // FINAL RESPONSE
    // =====================

    if (
      !message.tool_calls
    ) {

      return (
        message.content ||
        "Posso te ajudar com algo mais? 😊"
      );
    }

    messagesHistory.push(
      message
    );

    // =====================
    // TOOLS
    // =====================

    for (
      const toolCall
      of message.tool_calls
    ) {

      if (
        !("function" in toolCall)
      ) {

        continue;
      }

      const functionName =
        toolCall.function.name;

      const args =
        JSON.parse(
          toolCall.function.arguments
        );

      let toolResult: any =
        null;

      // =====================
      // SEARCH
      // =====================

      if (
        functionName ===
        "search_products"
      ) {

        toolResult =
          await searchProductsTool({

            query:
              args.query,

            conversationId,
          });
      }

      // =====================
      // CREATE CART
      // =====================

      if (
        functionName ===
        "create_cart"
      ) {

        toolResult =
          await createAiCartTool({
            conversationId,
          });
      }

      // =====================
      // ADD ITEM
      // =====================

      if (
        functionName ===
        "add_cart_item"
      ) {

        toolResult =
          await addCartItemTool({

            conversationId,

            productId:
              args.productId,

            quantity:
              args.quantity || 1,
          });
      }

      // =====================
      // UPDATE ITEM
      // =====================

      if (
        functionName ===
        "update_cart_item"
      ) {

        toolResult =
          await updateCartItemTool({

            conversationId,

            productId:
              args.productId,

            quantity:
              args.quantity,
          });
      }

      // =====================
      // SHIPPING
      // =====================

      if (
        functionName ===
        "calculate_shipping"
      ) {

        toolResult =
          await calculateShippingTool({

            conversationId,

            cep:
              args.cep,
          });
      }

      // =====================
      // CHECKOUT
      // =====================

      if (
        functionName ===
        "generate_checkout_link"
      ) {

        toolResult =
          await generateCheckoutLinkTool({
            conversationId,
          });

        // =====================
        // FINALIZA IMEDIATAMENTE
        // =====================

        return `
Seu pedido já está pronto ✨

Você pode finalizar sua compra com segurança pelo link abaixo:

${toolResult.url}

Lá você poderá:
• pagar com ${commercialPolicy.pix_discount_percent}% de desconto no PIX
• parcelar no cartão em ${cardConditions}
• calcular a entrega com frete grátis acima de ${freeShippingMinimum}
• finalizar seu pedido

Se precisar de ajuda, estou aqui 😊
`;
      }

      // =====================
      // SAVE TOOL
      // =====================

      messagesHistory.push({

        role:
          "tool",

        tool_call_id:
          toolCall.id,

        content:
          JSON.stringify(
            toolResult,
            null,
            2
          ),
      });
    }
  }

  // =====================
  // FALLBACK
  // =====================

  return `
Posso te ajudar com algo mais? 😊
`;
}
