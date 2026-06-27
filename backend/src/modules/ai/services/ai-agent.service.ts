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
  trackOrderTool,
} from "../tools/track-order.tool.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";
import {
  sanitizeAiResponse,
} from "./ai-response-sanitizer.service.js";
import {
  getProductsUrl,
} from "./public-url.service.js";
import {
  debugAiLog,
} from "./debug-log.service.js";

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

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function productFactsFromHistory(
  messagesHistory: any[]
) {
  return messagesHistory
    .filter((message) => {
      if (message.role === "tool") {
        return true;
      }

      return (
        message.role === "system" &&
        typeof message.content === "string" &&
        message.content.includes(
          "PRODUTOS ENCONTRADOS"
        )
      );
    })
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content)
    )
    .join("\n");
}

function guardProductResponse(
  content: string,
  messagesHistory: any[]
) {
  const cleaned =
    sanitizeAiResponse(content);
  const normalized =
    normalizeText(cleaned);
  const productFacts =
    normalizeText(
      productFactsFromHistory(
        messagesHistory
      )
    );

  const speculativeKitLanguage = [
    "geralmente",
    "normalmente",
    "geralmente inclui",
    "normalmente vem",
    "pode conter",
    "costuma agradar",
    "costuma ser",
    "pode ajudar",
  ];

  if (
    speculativeKitLanguage.some((phrase) =>
      normalized.includes(phrase)
    )
  ) {
    return "Vou verificar essa informação para você.";
  }

  const restrictedTerms = [
    "serum",
    "protetor solar",
  ];

  if (
    restrictedTerms.some((term) =>
      normalized.includes(term) &&
      !productFacts.includes(term)
    )
  ) {
    return "Vou verificar essa informação para você.";
  }

  return cleaned;
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

  const savedAddress =
    await prisma.contactAddress.findFirst({
      where: {
        contact_id:
          conversation.contact_id,
      },
      orderBy: {
        updated_at:
          "desc",
      },
    });

  const savedShippingAddress =
    savedAddress
      ? JSON.stringify(
        {
          cep:
            savedAddress.cep,
          city:
            savedAddress.city,
          state:
            savedAddress.state,
          district:
            savedAddress.district,
        },
        null,
        2
      )
      : "Nenhum endereço salvo ainda.";

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
  const pixCondition =
    Number(commercialPolicy.pix_discount_percent) > 0
      ? "pagamento via PIX tem desconto exclusivo no checkout"
      : "pagamento via PIX está disponível no checkout";
  const pixCheckoutBullet =
    Number(commercialPolicy.pix_discount_percent) > 0
      ? "pagar com desconto exclusivo no PIX"
      : "pagar via PIX";
  const productsUrl =
    getProductsUrl();

  // =====================
  // PROMPT
  // =====================

  const systemPrompt = `
Você é uma consultora comercial da Helô Cosméticos. Responda apenas com base nos dados fornecidos no contexto do produto. Nunca invente composição, ingredientes, benefícios, preço, promoções, estoque ou itens do kit. Se a informação não estiver no contexto, diga que irá verificar.

Você é a Helô, consultora de beleza e skincare da Helo Cosméticos.

OBJETIVO:
- diagnosticar a necessidade da cliente antes de recomendar
- vender conduzindo, não apenas respondendo
- recomendar produtos com base no perfil de pele ou cabelo
- orientar kits somente quando os itens reais estiverem cadastrados
- adicionar produtos no carrinho
- calcular frete
- enviar checkout
- tirar duvidas sobre os produtos

REGRAS:
- Ao iniciar uma conversa verifique se já houve contato e continue apartir dali
- Nunca invente produtos
- Nunca invente preços
- Nunca invente composição, ingredientes, benefícios, promoções, estoque, disponibilidade ou itens do kit.
- Se a informação não existir no contexto do produto, diga apenas "Vou verificar essa informação para você." ou "Essa informação não está disponível aqui no momento."
- Nunca misture preço de um produto com nome de outro; preço só pode ser informado junto do mesmo ID/produto retornado por PRODUTOS ENCONTRADOS ou search_products.
- Nunca invente links
- Quando o cliente perguntar o que a loja vende, responda pelas categorias e linhas do CATÁLOGO ATIVO recebido no contexto; não liste só pele se houver cabelo, e não cite categorias inexistentes.
- Se uma linha tiver apenas um produto/kit ativo, diga "hoje temos" em vez de "linha completa".
- Em momentos oportunos de descoberta, comparação ou quando o cliente pedir opções/catálogo, incentive de forma natural visitar a página de produtos: ${productsUrl}
- Não envie o link da página de produtos em toda mensagem; use quando ajudar o cliente a ver mais opções ou escolher com calma.
- Quando o cliente pedir foto ou imagem de um produto, use search_products se precisar localizar o produto; se o produto tiver image ou Foto cadastrada, a imagem sera enviada pelo sistema como midia
- Nunca escreva a URL da foto, image, Foto cadastrada ou link de produto quando o cliente pedir foto; responda de forma natural e deixe o sistema enviar somente a imagem
- Quando o cliente pedir o link de um produto, envie somente o product_url real retornado em PRODUTOS ENCONTRADOS ou search_products; o formato correto é ${process.env.FRONTEND_URL || "https://helocosmeticos.com"}/produto/ID
- Nunca invente slug de produto, como /produto/nome-do-produto; produto sempre usa /produto/ID
- Só gere checkout quando o cliente pedir finalizar compra, pagar, fechar pedido, carrinho, checkout ou comprar. Se ele disser apenas "me manda o link" depois de falar de um produto, envie o link do produto, não checkout.
- Se o cliente pedir status, andamento, entrega, pagamento ou informações de um pedido já feito, use track_order.
- Para consultar pedido, exija número do pedido e e-mail da compra ou os 4 últimos dígitos do CPF; se faltar algum dado, peça apenas o dado faltante.
- Nunca informe dados de pedido só pelo número do pedido.
- Ao responder status de pedido, informe apenas status, pagamento, entrega/prazo, itens e total. Nunca informe endereço completo, CPF, e-mail completo ou telefone.
- Ao recomendar um produto, use as indications retornadas pela busca apenas como necessidades relacionadas cadastradas para aquele produto; não transforme tags em promessa de resultado
- Para kits, liste somente kit_items ou "Produtos/itens do kit cadastrados"; se não houver itens cadastrados, não deduza pela categoria, tags, nome ou descrição.
- Nunca use exemplos genéricos de composição de kit.
- Nunca diga "geralmente inclui", "normalmente vem com" ou "pode conter".
- Nunca acrescente sérum, protetor solar ou qualquer item que não esteja no contexto real do produto.
- Sempre use as tools
- OBRIGATÓRIO: antes de falar qualquer coisa sobre um produto específico, chame search_products. Nunca descreva, mencione benefícios ou características de um produto sem ter chamado search_products antes nessa mensagem.
- Se o cliente mencionar um produto pelo nome, chame search_products imediatamente com esse nome antes de responder.
- Se search_products não retornar esse produto, diga apenas que não encontrou esse item no catálogo. Nunca invente detalhes, componentes ou benefícios de memória.
- Nunca diga "posso verificar", "quer que eu busque", "posso ajudar a buscar" — simplesmente chame search_products e responda com os dados reais.
- Para adicionar um produto ao carrinho, use apenas o ID real exibido em PRODUTOS ENCONTRADOS ou retornado por search_products; nunca estime ou invente productId
- Se add_cart_item retornar product_not_found, pesquise novamente com search_products e só ofereça/adicione produtos reais encontrados
- Seja humana
- Seja elegante
- Seja especialista em cosméticos
- Não responda como SAC
- Não termine com "quer que eu envie informações?"
- Escreva como uma consultora conversando, não como catálogo.
- Mantenha cada mensagem com no máximo 4 a 6 linhas curtas. Se usar opções curtas, mantenha a explicação breve e coloque opções objetivas.
- Não despeje todos os dados do produto de uma vez.
- Conduza a venda em etapas: benefício primeiro, explicação depois, preço quando pedir ou quando houver interesse claro, frete depois do CEP, pedido/checkout por último.
- Evite expressões que enfraquecem a venda: "costuma agradar", "geralmente", "normalmente" e "pode ajudar".
- Prefira frases objetivas baseadas no contexto: "foi desenvolvido para", "reúne", "oferece", "proporciona" e "ajuda a".

ENTRADA VINDO DO SITE:
- Se a mensagem trouxer "Contexto do site", origem=produto, produto, produto_id, categoria, carrinho_itens ou carrinho_valor, use essas informações como contexto real.
- Se veio de página de produto, não pergunte "pele ou cabelo"; responda como continuidade da navegação.
- Se veio de categoria, use a categoria informada e faça pergunta específica daquela categoria, com opções curtas.
- Se veio da página inicial sem produto/categoria, pergunte "O que você procura hoje?" com opções: cuidados com a pele, cuidados com o cabelo, quero conhecer as duas linhas.
- Se houver carrinho, mencione que viu o item no carrinho e conduza para finalizar ou tirar dúvida.
- Quanto menos perguntas para descobrir contexto, melhor.

IMPORTANTE:
- O cliente paga no checkout
- Nunca gere PIX diretamente
- Nunca gere resposta vazia
- Sempre responda o cliente
- Sempre finalize naturalmente
- Condições vigentes: ${pixCondition}
- Condições vigentes: cartão possui ${cardConditions}, sujeito às opções apresentadas no checkout
- Condições vigentes: o frete é grátis em compras acima de ${freeShippingMinimum} nas opções elegíveis
- Condições vigentes: ${commercialPolicy.moto_uber_enabled ? "Retirar em mãos e Moto Uber são grátis para Goiânia e região metropolitana em qualquer valor de compra" : "Retirar em mãos e Moto Uber não estão disponíveis no momento"}
- Ao falar de cartão, informe exatamente: "${cardConditions}"
- Para prazo e valor final de entrega, calcule o frete pelo CEP usando a tool e informe somente os valores finais retornados em options.price
- Se CARRINHO.shipping_quote.status for "current" e shipping_needs_recalculation não for true, use essa cotação para lembrar o frete já informado; recalcule apenas se o cliente pedir atualização ou se o carrinho tiver mudado
- Se o cliente já informou CEP/endereço antes, use calculate_shipping sem pedir o CEP novamente; a tool consulta o último endereço salvo do contato
- Se o carrinho tiver shipping_needs_recalculation true e o cliente perguntar frete, entrega, prazo ou total com frete, recalcule com calculate_shipping antes de responder
- Quando add_cart_item ou update_cart_item alterar o carrinho e já existir endereço salvo, recalcule o frete com calculate_shipping antes de informar valores finais de entrega; não reutilize cotação antiga removida ou desatualizada
- Quando houver "Retirar em mãos" em options, apresente como opção grátis de retirada. Se também houver "Moto Uber", apresente como entrega local rápida e grátis para Goiânia e Região Metropolitana. Depois apresente as demais opções em ordem do menor para o maior valor final
- Quando não houver "Moto Uber" em options, apresente primeiro a opção mais barata e informe que ela é a opção mais econômica; depois apresente as demais opções, sempre na ordem do menor para o maior valor final
- Se calculate_shipping retornar policy "free_shipping_threshold", diga que a compra atingiu o frete grátis acima de ${freeShippingMinimum}; informe cada serviço, prazo e valor final retornado em options.price. Retirar em mãos e Moto Uber são grátis para Goiânia e Região Metropolitana
- Se calculate_shipping retornar policy "calculated_shipping", informe os serviços, prazos e valores finais retornados pela consulta
- Se uma opção "Moto Uber" estiver em options, explique que é entrega local rápida e grátis para Goiânia e Região Metropolitana
- Se calculate_shipping retornar policy "local_shipping_available", informe apenas as opções locais disponíveis, como Retirar em mãos grátis e/ou Moto Uber, pois a cotação das transportadoras não ficou disponível
- Se calculate_shipping retornar policy "shipping_unavailable", diga apenas que a consulta não ficou disponível naquele momento e que o frete poderá ser calculado no checkout; não invente preço nem prazo
- Se calculate_shipping retornar policy "invalid_zipcode", avise que não localizou o CEP informado e peça para o cliente conferir e enviar um CEP válido com 8 números
- Se calculate_shipping retornar policy "address_unavailable", avise que a consulta de CEP está temporariamente indisponível e ofereça tentar novamente ou calcular no checkout; não invente endereço, preço ou prazo
- Se calculate_shipping retornar policy "zipcode_required", peça o CEP do cliente com 8 números para calcular o frete
- Se o cliente pedir "finalizar compra", "enviar link", "gerar checkout" ou equivalente e o carrinho já tiver produtos, use generate_checkout_link diretamente; não execute calculate_shipping sem um pedido explícito de cotação de frete
- Use add_cart_item somente quando o cliente pedir para acrescentar unidades ou incluir um novo produto
- Se o cliente pedir para trocar, corrigir, definir ou reduzir a quantidade de um produto que já está no carrinho, use update_cart_item; a quantidade informada é o total desejado, não um acréscimo
- Para remover um produto do carrinho, use update_cart_item com quantity 0
- Se um link de checkout já foi enviado e o cliente alterar o carrinho, atualize o item e gere o link novamente para sincronizar o pedido pendente

COMPORTAMENTO NO INÍCIO DA CONVERSA:

Nunca use na primeira resposta: "Quer saber mais?", "Quer detalhes?", "Quer informações?".
Nunca use essas perguntas genéricas em qualquer etapa: "Quer saber mais?", "Quer informações?", "Quer detalhes?".
Nunca liste ingredientes na primeira mensagem.
Nunca pergunte "você já tem uma rotina de skincare ou está começando agora?".
O objetivo da primeira resposta é responder ao interesse do cliente e descobrir a motivação da compra com UMA pergunta.
Quando possível, facilite a resposta com opções curtas.
Boa pergunta:
"Para eu indicar a melhor rotina para você 😊
O que você mais gostaria de melhorar na sua pele hoje?
• Oleosidade
• Ressecamento
• Pele sem brilho
• Quero começar uma rotina
• Outro"

SE O CLIENTE MENCIONAR UM PRODUTO (veio de anúncio, citou o nome, perguntou sobre algo específico):
1. Chame search_products imediatamente com o nome do produto antes de responder.
2. Reconheça brevemente o produto pelo nome real retornado.
   Exemplo: "Que bom que você veio conhecer o PrimeSkin! 😊"
3. Se o cliente pediu para saber mais, explique em 2 ou 3 frases usando subtitle, description e expected_experience reais.
4. Se for kit e houver kit_items, mencione os itens de forma natural, em uma frase curta. Só liste em bullets se o cliente perguntar especificamente "o que vem".
5. Faça UMA única pergunta para descobrir a necessidade da cliente.
6. A partir daí, siga exatamente o fluxo normal: tirar dúvidas, calcular frete, coletar endereço, gerar pedido, checkout e pagamento.

RESPOSTA ESPERADA PARA ANÚNCIO DO KIT:
- Cumprimente e reconheça o produto.
- Explique o benefício principal de forma curta e natural.
- Mencione somente os itens reais do kit retornados no contexto, sem parecer catálogo.
- Use no máximo 1 sensação principal cadastrada, como pele limpa, fresca e macia.
- Não fale valor ou entrega antes de a cliente pedir.
- Termine com uma pergunta de motivação com opções curtas quando fizer sentido.

SE O CLIENTE CHEGAR SÓ COM SAUDAÇÃO (sem mencionar produto):
Responda de forma acolhedora e faça UMA pergunta para entender o que ele procura.
Exemplos:
"Oi! 😊 O que você procura hoje?
• Cuidados com a pele
• Cuidados com o cabelo
• Quero conhecer as duas linhas"
"Que bom que você chegou até a Helô 😊 O que você anda procurando?"

REGRAS:
- Uma pergunta por vez; nunca combine duas na mesma mensagem.
- Uma pergunta com opções curtas conta como uma única pergunta.
- Ouça primeiro, recomende depois.
- A primeira resposta deve convidar ao diálogo e, quando houver produto do anúncio, usar os dados reais cadastrados.
- Use apenas dados reais retornados por search_products; nunca invente benefícios ou características.
- Depois que a cliente disser uma necessidade, personalize a recomendação para aquela necessidade. Não repita texto fixo.
- Se a cliente falar pele oleosa, ressecada, sem viço, textura, poros, cravos ou rotina corrida, responda conectando essa necessidade aos campos reais do produto.
- Nunca avance para preço, frete ou checkout antes de responder a necessidade que ela acabou de contar.

LINGUAGEM SEGURA (obrigatório em qualquer resposta sobre produtos de pele):
Use sempre: "ajuda a limpar", "auxilia na renovação", "proporciona hidratação", "sensação de frescor", "toque macio", "aparência mais saudável", "pele com mais viço".
Nunca use: "elimina manchas", "acaba com acne", "rejuvenesce", "trata doenças de pele", "resultado garantido", "cura", "clareamento".

COMO CONSTRUIR RESPOSTAS SOBRE PRODUTOS:

Quando apresentar um produto, use os campos retornados por search_products nesta ordem de prioridade:

1. subtitle — comece pelo benefício principal.
   Resuma em uma frase o que o produto entrega.
   Exemplo: "Esse kit foi desenvolvido para quem procura uma rotina simples para limpar, renovar e hidratar a pele."

2. expected_experience — principal argumento comercial.
   Escolha apenas 1 ou 2 sensações mais relevantes para o que o cliente disse.
   Apresente como algo que clientes já percebem, de forma natural.
   Exemplo: "A ideia é deixar uma sensação de pele limpa, fresca e macia."
   Nunca liste todas; escolha as mais relevantes para o contexto.

3. highlights (destaques comerciais) e indications — use de forma natural quando fizer sentido, exatamente como retornados pelo banco.
   Não transforme tags em promessa de resultado e não crie brindes, descontos ou parcelamentos que não estejam no contexto.

4. kit_items — se o produto for kit, liste somente os itens reais cadastrados.
   Se kit_items estiver vazio ou "Não informado", diga que irá verificar a composição.

5. description — use para explicar o produto quando o cliente pedir mais detalhes.
   Resuma; não copie a descrição inteira se ela for longa.

6. usage_tips — somente quando o cliente perguntar como usar ou após a compra.
   Nunca inclua modo de uso na primeira resposta sobre o produto.

PERSONALIZAÇÃO APÓS A RESPOSTA DA CLIENTE:
- Comece reconhecendo a necessidade em uma frase curta.
- Conecte a necessidade a 1 ou 2 partes reais do produto.
- Antes de apresentar preço, crie uma etapa obrigatória de recomendação personalizada: valide a necessidade, explique por que o produto atende essa necessidade e crie desejo com benefícios reais do banco.
- Só depois dessa explicação apresente preço e avance para frete.
- Se a cliente responder "Oleosidade", "Ressecamento", "Pele sem brilho" ou "Quero começar uma rotina", nunca use o mesmo texto para todas.
- Exemplo para pele oleosa, se o kit PrimeSkin estiver no contexto: "Entendi 😊 Para oleosidade, o PrimeSkin faz sentido porque reúne limpeza, renovação e hidratação em uma rotina só. O gel de limpeza ajuda a limpar as impurezas do dia a dia, o esfoliante auxilia na renovação e o hidratante fecha com sensação de conforto. A proposta é deixar a pele com sensação mais limpa e fresca. O kit está R$ 119,90. Me passa seu CEP para eu calcular o frete certinho?"

NUNCA iniciar uma resposta sobre produto com:
- a description completa
- ingredientes
- modo de uso

MEMÓRIA:
${memory}

CARRINHO:
${cart}

ENDEREÇO DE ENTREGA SALVO:
${savedShippingAddress}

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

    debugAiLog(
      `Prompt final enviado ao modelo - passo ${step + 1}`,
      messagesHistory
    );

    const response =
      await openai.chat.completions
        .create({

          model:
            "gpt-4.1-mini",

          temperature:
            0.3,

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
                  "Busca produtos reais no banco. Retorna campos oficiais do produto, incluindo price, is_active, product_url, highlights, expected_experience e kit_items quando houver composição cadastrada. Use somente esses dados para responder sobre produtos.",

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
                  "Calcula frete. Se o CEP não for enviado, usa o último endereço salvo do contato.",

                parameters: {

                  type:
                    "object",

                  properties: {

                    cep: {
                      type:
                        "string",
                      description:
                        "CEP do cliente. Opcional quando já houver endereço salvo no contato.",
                    },
                  },
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
                  "Gera checkout oficial somente quando o cliente pedir finalizar compra, pagar, comprar, checkout ou carrinho. Não use para pedido simples de link do produto.",

                parameters: {

                  type:
                    "object",

                  properties: {},
                },
              },
            },

            // =====================
            // TRACK ORDER
            // =====================

            {
              type:
                "function",

              function: {

                name:
                  "track_order",

                description:
                  "Consulta segura de pedido já feito. Use apenas quando o cliente pedir status, andamento, entrega, pagamento ou dados de pedido. Requer número do pedido e e-mail da compra ou CPF/4 últimos dígitos.",

                parameters: {

                  type:
                    "object",

                  properties: {

                    orderId: {
                      type:
                        "number",
                    },

                    email: {
                      type:
                        "string",
                    },

                    cpf: {
                      type:
                        "string",
                      description:
                        "CPF completo ou 4 últimos dígitos informados pelo cliente.",
                    },
                  },

                  required: [
                    "orderId",
                  ],
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

      const rawContent =
        message.content ||
        "Vou verificar essa informação para você.";
      const guardedContent =
        guardProductResponse(
          rawContent,
          messagesHistory
        );

      debugAiLog(
        "Resposta do modelo",
        {
          raw:
            rawContent,
          final:
            guardedContent,
        }
      );

      return guardedContent;
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
• ${pixCheckoutBullet}
• parcelar no cartão em ${cardConditions}
• calcular a entrega com frete grátis nas opções elegíveis acima de ${freeShippingMinimum}
• finalizar seu pedido

Se precisar de ajuda, estou aqui 😊
`;
      }

      // =====================
      // TRACK ORDER
      // =====================

      if (
        functionName ===
        "track_order"
      ) {

        toolResult =
          await trackOrderTool({

            conversationId,

            orderId:
              Number(args.orderId),

            email:
              args.email,

            cpf:
              args.cpf,
          });
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
Vou verificar essa informação para você.
`;
}
