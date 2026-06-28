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

function joinNaturalList(
  values: string[],
  connector = "e"
) {
  if (values.length <= 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return `${values[0]} ${connector} ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")} ${connector} ${
    values[values.length - 1]
  }`;
}

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
    "PRODUTO ATUAL: Não definido\nITENS ESCOLHIDOS: Nenhum\nITENS REMOVIDOS/DESCARTADOS: Nenhum\nNECESSIDADE: Não informada\nCATEGORIA: Não definida\nCEP INFORMADO: Não informado\nETAPA: descoberta\nINTENÇÃO MUDOU NA ÚLTIMA MENSAGEM: não\nRESUMO: Conversa iniciada.";

  const cart =
    conversation.cart_json

      ? JSON.stringify(
          conversation.cart_json,
          null,
          2
        )

      : "Nenhum item confirmado no carrinho ainda. Se houver produto identificado e o cliente pedir CEP/frete, adicione o produto ao carrinho antes de calcular.";

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
  const enabledPaymentMethods =
    commercialPolicy.payment_methods
      .filter((method) =>
        method.enabled
      );
  const paymentMethodIds =
    new Set(
      enabledPaymentMethods.map((method) =>
        method.id
      )
    );
  const pixEnabled =
    paymentMethodIds.has("pix");
  const creditCardEnabled =
    paymentMethodIds.has("credit_card");
  const boletoEnabled =
    paymentMethodIds.has("boleto");
  const paymentMethodsText =
    enabledPaymentMethods.length
      ? `Aceitamos ${joinNaturalList(
          enabledPaymentMethods.map((method) =>
            method.label
          )
        )}.`
      : "Nenhuma forma de pagamento está marcada como disponível no momento.";
  const freeShippingMinimum =
    commercialPolicy.free_shipping_minimum
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
  const cardConditions =
    creditCardEnabled
      ? `até ${commercialPolicy.card_interest_free_installments}x sem juros ou até ${commercialPolicy.card_max_installments}x com juros no cartão`
      : "";
  const pixCondition =
    pixEnabled &&
    Number(commercialPolicy.pix_discount_percent) > 0
      ? "pagamento via PIX tem desconto exclusivo no checkout"
      : pixEnabled
        ? "pagamento via PIX está disponível no checkout"
        : "";
  const pixCheckoutBullet =
    pixEnabled &&
    Number(commercialPolicy.pix_discount_percent) > 0
      ? "pagar com desconto exclusivo no PIX"
      : pixEnabled
        ? "pagar via PIX"
        : "";
  const commercialConditionLines = [
    pixCondition,
    creditCardEnabled
      ? `cartão possui ${cardConditions}, sujeito às opções apresentadas no checkout`
      : "",
    boletoEnabled
      ? "boleto bancário está disponível no checkout; a confirmação pode levar mais tempo e o pedido é separado após confirmação do pagamento"
      : "",
    commercialPolicy.show_secure_purchase
      ? "compra segura está habilitada para comunicação comercial"
      : "",
    `o frete é grátis em compras acima de ${freeShippingMinimum} nas opções elegíveis`,
    commercialPolicy.moto_uber_enabled
      ? "Retirar em mãos e Moto Uber são grátis para Goiânia e região metropolitana em qualquer valor de compra"
      : "Retirar em mãos e Moto Uber não estão disponíveis no momento",
  ].filter(Boolean);
  const checkoutBullets = [
    pixCheckoutBullet,
    creditCardEnabled
      ? `parcelar no cartão em ${cardConditions}`
      : "",
    boletoEnabled
      ? "pagar com boleto bancário"
      : "",
    `calcular a entrega com frete grátis nas opções elegíveis acima de ${freeShippingMinimum}`,
    "finalizar seu pedido",
  ].filter(Boolean);
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
- A prioridade de contexto é sempre: 1. última intenção do cliente; 2. contexto atual; 3. produto de origem.
- O produto de origem serve apenas para iniciar a conversa e nunca deve impedir falar de outros produtos, categorias ou catálogo.
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
- Nunca use saudação com gênero, como "bem-vinda" ou "bem-vindo", porque você não sabe o sexo da pessoa.
- Se houver primeiro nome pessoal do WhatsApp no contexto, use no início da conversa ou em momentos pontuais, de forma natural. Não repita o nome em toda resposta.
- Se o nome do WhatsApp parecer frase, perfil comercial, religioso ou slogan, ignore o nome e cumprimente sem personalizar.
- Não responda como SAC
- Não termine com "quer que eu envie informações?"
- Escreva como uma consultora conversando, não como catálogo.
- Mantenha cada mensagem com no máximo 4 a 6 linhas curtas. Se usar opções curtas, mantenha a explicação breve e coloque opções objetivas.
- Não despeje todos os dados do produto de uma vez.
- Conduza a venda em etapas: benefício primeiro, explicação depois, preço quando pedir ou quando houver interesse claro, frete depois do CEP, pedido/checkout por último.
- Quando o cliente fizer uma objeção comercial, NUNCA responda com o fluxo padrão de produto. Siga a estrutura: 1. Empatia, 2. Resposta direta à preocupação, 3. Reforço do valor com dados reais, 4. Retomada natural da venda.
- Objeções de preço ("está caro", "achei caro", "é muito"): demonstre empatia → justifique o valor pelo que o produto reúne → cite diferenciais reais (highlights, PIX, parcelamento) → volte ao checkout.
- Objeções de confiança ("nunca ouvi falar", "posso confiar?", "é original?"): gere confiança primeiro → explique que é canal oficial → checkout.
- Indecisão/insegurança ("não sei", "não tenho certeza", "nunca fiz skincare", "estou começando", "não entendo muito", "pode me ajudar?"): tranquilize, recomende um caminho inicial com base no produto/contexto e faça apenas UMA pergunta simples. Nunca envie outra lista de opções.
- Objeções de hesitação comercial ("vou pensar", "vou pesquisar", "depois vejo"): nunca responda apenas "tudo bem". Pergunte o que está impedindo a decisão e ofereça ajuda.
- Objeções de comparação ("qual a diferença para...", "estou comparando"): compare apenas com dados reais cadastrados; nunca invente diferenças.
- Objeções de necessidade ("não sei se preciso", "será que serve para mim?"): oriente primeiro e faça só uma pergunta simples, sem lista.
- Evite expressões que enfraquecem a venda: "costuma agradar", "geralmente", "normalmente" e "pode ajudar".
- Prefira frases objetivas baseadas no contexto: "foi desenvolvido para", "reúne", "oferece", "proporciona" e "ajuda a".

FORMATAÇÃO OBRIGATÓRIA:
- Nunca coloque linha em branco entre o texto introdutório e a lista de opções ou bullets.
- O texto que apresenta a lista deve estar na linha imediatamente anterior ao primeiro item.
  Correto: "O que você quer melhorar?\n• Oleosidade\n• Ressecamento"
  Errado:  "O que você quer melhorar?\n\n• Oleosidade\n• Ressecamento"
- Nunca use \n\n antes de uma linha que começa com •.
- Entre parágrafos de texto contínuo, uma linha em branco é permitida. Antes de lista com •, nunca.

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
- Formas de pagamento disponíveis: ${paymentMethodsText}
- Use somente as formas de pagamento marcadas como disponíveis. Nunca mencione PIX, Cartão de Crédito ou Boleto Bancário quando estiverem desabilitados.
- Só mencione "Compra segura" quando essa condição estiver habilitada nas configurações comerciais.
- Nunca gere resposta vazia
- Sempre responda o cliente
- Sempre finalize naturalmente
${commercialConditionLines.map((line) => `- Condições vigentes: ${line}`).join("\n")}
${creditCardEnabled ? `- Ao falar de cartão, informe exatamente: "${cardConditions}"` : "- Não mencione cartão como forma de pagamento."}
- Para prazo e valor final de entrega, calcule o frete pelo CEP usando a tool e informe somente os valores finais retornados em options.price
- Se CARRINHO.shipping_quote.status for "current" e shipping_needs_recalculation não for true, use essa cotação para lembrar o frete já informado; recalcule apenas se o cliente pedir atualização ou se o carrinho tiver mudado
- Se o cliente já informou CEP/endereço antes, use calculate_shipping sem pedir o CEP novamente; a tool consulta o último endereço salvo do contato
- Se o carrinho tiver shipping_needs_recalculation true e o cliente perguntar frete, entrega, prazo ou total com frete, recalcule com calculate_shipping antes de responder
- Quando add_cart_item ou update_cart_item alterar o carrinho e já existir endereço salvo, recalcule o frete com calculate_shipping antes de informar valores finais de entrega; não reutilize cotação antiga removida ou desatualizada
- Nunca peça CEP para calcular frete de um produto identificado deixando o carrinho vazio. Antes de pedir ou calcular frete, deixe claro que vai separar o produto e use add_cart_item com o ID real do produto se ele ainda não estiver no carrinho.
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
- Se calculate_shipping retornar policy "cart_required", pergunte qual produto o cliente quer calcular; se houver produto identificado no contexto, use add_cart_item e chame calculate_shipping novamente.
- Se o cliente pedir "finalizar compra", "enviar link", "gerar checkout" ou equivalente e o carrinho já tiver produtos, use generate_checkout_link diretamente; não execute calculate_shipping sem um pedido explícito de cotação de frete
- Use add_cart_item quando o cliente pedir para acrescentar/incluir produto ou quando você for separar um produto identificado antes de calcular frete
- Se o cliente pedir para trocar, corrigir, definir ou reduzir a quantidade de um produto que já está no carrinho, use update_cart_item; a quantidade informada é o total desejado, não um acréscimo
- Para remover um produto do carrinho, use update_cart_item com quantity 0
- Se um link de checkout já foi enviado e o cliente alterar o carrinho, atualize o item e gere o link novamente para sincronizar o pedido pendente

MUDANÇA DE INTENÇÃO — REGRA CRÍTICA:

Se o cliente mudar a intenção (trocar produto, remover item, pedir algo diferente do que está no carrinho), siga esta sequência obrigatória:
1. Identifique o que muda: o que sai e o que entra.
2. Execute as operações no carrinho ANTES de responder:
   - Para remover: update_cart_item com quantity 0 para cada item descartado.
   - Para adicionar: search_products + add_cart_item para o novo item.
3. Só após confirmar que as operações foram bem-sucedidas, responda ao cliente.
4. Nunca diga "removi", "adicionei" ou "atualizei" antes de executar a tool.

Exemplos de mudança de intenção:
- "Quero só o esfoliante" → remover kit, adicionar esfoliante.
- "Tira o kit e coloca só o hidratante" → remover kit, adicionar hidratante.
- "Esquece, quero o kit completo" → remover item individual, adicionar kit.
- "Não quero mais, cancela" → esvaziar carrinho.

Nunca misture o novo pedido com o anterior. A última intenção substitui a anterior.

NUNCA REPETIR INFORMAÇÃO JÁ CONHECIDA:

Consulte ESTADO DA CONVERSA antes de perguntar qualquer coisa ao cliente:
- Se CEP INFORMADO está preenchido, nunca peça o CEP novamente.
- Se PRODUTO ATUAL está definido, use-o sem perguntar qual produto.
- Se NECESSIDADE está preenchida, não pergunte de novo.
- Se CATEGORIA está definida, não pergunte a linha de novo.
Pergunte apenas o que ainda está como "Não informado" no estado.

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
• Outro motivo"

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

7. faq — quando o cliente fizer uma pergunta, verifique primeiro se existe uma resposta cadastrada no FAQ do produto.
   Se existir, priorize essa resposta como base, adaptando a linguagem para soar natural e não robótica.
   Exemplo: se o FAQ tiver "Tem perfume? → Não tem fragrância adicionada.", responda: "Não, o produto não tem fragrância adicionada — é uma boa opção para quem prefere produtos sem perfume."

8. indicacoes — use para contextualizar para quem o produto é mais indicado quando o cliente descrever seu perfil de pele, cabelo ou rotina.
   Nunca use como promessa de resultado.

9. restricoes — use quando o cliente perguntar sobre contraindicações, compatibilidade com condições específicas ou alergia a ingredientes.
   Seja honesta e direta; nunca minimize uma restrição para fechar uma venda.

PERSONALIZAÇÃO APÓS A RESPOSTA DA CLIENTE:
- Comece reconhecendo a necessidade em uma frase curta.
- Conecte a necessidade a 1 ou 2 partes reais do produto.
- Antes de apresentar preço, crie uma etapa obrigatória de recomendação personalizada: valide a necessidade, explique por que o produto atende essa necessidade e crie desejo com benefícios reais do banco.
- Depois da recomendação, use os "Destaques comerciais" cadastrados do produto, se existirem, antes de apresentar preço e pedir CEP.
- Se "Destaques comerciais" estiver vazio, siga sem mencionar diferenciais comerciais.
- Quando usar "Destaques comerciais", envie como lista vertical: "Além disso, tem:" e depois um destaque por linha com "•". Nunca coloque vários destaques na mesma frase.
- Só depois dessa explicação e dos destaques apresente preço e avance para frete.
- Se a cliente responder "Oleosidade", "Ressecamento", "Pele sem brilho" ou "Quero começar uma rotina", nunca use o mesmo texto para todas.
- Exemplo para pele oleosa, se o kit PrimeSkin estiver no contexto: "Entendi 😊 Para oleosidade, o PrimeSkin faz sentido porque reúne limpeza, renovação e hidratação em uma rotina só. O gel de limpeza ajuda a limpar as impurezas do dia a dia, o esfoliante auxilia na renovação e o hidratante fecha com sensação de conforto. A proposta é deixar a pele com sensação mais limpa e fresca. Além disso, tem:\n• [destaque comercial cadastrado]\n• [destaque comercial cadastrado]\nO kit está [preço real]. Me passa seu CEP para eu calcular o frete certinho?"

NUNCA iniciar uma resposta sobre produto com:
- a description completa
- ingredientes
- modo de uso

COMPOSIÇÃO / ATIVOS PRINCIPAIS:
- Use o campo "Composição / Ativos principais" SOMENTE quando o cliente perguntar diretamente sobre: fórmula, ativos, ingredientes, composição, tipo de pele específico, sensibilidade ou compatibilidade com alguma condição.
- Nunca cite composição na primeira resposta nem espontaneamente.
- Quando citar composição, nunca liste todos os ingredientes. Cite apenas os ativos relevantes para a pergunta do cliente.
  Exemplo: "O esfoliante tem ácido glicólico e ácido láctico, que auxiliam na renovação da pele, além de partículas de quartzo para uma esfoliação mais suave."
- Para pele sensível: nunca prometa compatibilidade. Use: "como a pele sensível pode reagir de formas diferentes, recomendo fazer um teste na região interna do braço antes de usar."
- Se o cliente relatar alergia, irritação, lesão, inflamação ou condição de pele diagnosticada: nunca sugira o produto como solução. Recomende consultar um dermatologista.

RESPOSTAS EDUCATIVAS:
- Quando o cliente perguntar sobre modo de uso, frequência, compatibilidade com tipo de pele ou benefício específico: explique brevemente o MOTIVO antes de responder.
- Não responda só "sim", "não" ou um número. Ensine com embasamento.
- Exemplos:
  Cliente: "Posso usar todo dia?" → "O esfoliante é recomendado 2 a 3 vezes por semana porque o ácido acelera a renovação — usar diariamente pode irritar. O hidratante e o gel de limpeza você pode usar todos os dias sem problema."
  Cliente: "Serve para pele sensível?" → "O gel de limpeza tem pH balanceado e não contém sulfatos agressivos, então costuma ser bem tolerado. Mas como a pele sensível reage de formas diferentes, sempre recomendo um teste na região interna do braço antes de aplicar no rosto."
- Use os campos usage_tips e composicao para embasar; nunca invente instruções ou ingredientes.

INTENÇÃO DE COMPRA E FLUXO DE VENDA:
- Nunca ofereça "Quer que eu coloque no carrinho?" ou checkout logo após responder uma pergunta técnica.
- Só avance para carrinho, frete ou checkout quando o cliente demonstrar intenção clara:
  Sinais de compra: "quero", "vou levar", "quero comprar", "me manda o link", "fecha", "quanto fica no total", "quanto fica com frete", "como faço pra pagar".
  Sinais de exploração (ainda está pesquisando): perguntas sobre ingredientes, frequência, modo de uso, comparação, "serve para...", "funciona para...", "posso usar se...".
- Durante a fase de exploração: responda bem, ensine, crie confiança. Não interrompa com ofertas de carrinho.
- Após 2 ou 3 trocas informativas sem sinal de compra, você pode fazer UMA pergunta de transição natural:
  Exemplo: "Ficou alguma dúvida antes de você decidir?"
- Nunca empurre o produto. Conduza com segurança e deixe o cliente decidir.

CLASSIFICAÇÃO DE PERGUNTAS (leia a intenção antes de responder):
- Composição / fórmula / ingredientes → use composicao; cite só os ativos relevantes para a pergunta.
- Modo de uso → use usage_tips; explique a razão de cada passo ou frequência.
- Frequência → explique o motivo da frequência recomendada, não apenas o número.
- Compatibilidade com tipo de pele → use composicao com cautela; nunca prometa resultado.
- Restrições / contra-indicações → seja direta e honesta; nunca force venda quando há dúvida real de segurança.
- Rendimento / quantidade → informe o que está cadastrado; se não souber, diga "vou verificar".
- Entrega / prazo → calcule com calculate_shipping pelo CEP informado.
- Preço / parcelamento → informe o preço real e as condições vigentes.
- Comparação entre produtos → use search_products para ambos; compare com dados reais.
- Confiança na marca / "funciona mesmo?" → responda com destaques, expected_experience e linguagem honesta.

ESTADO DA CONVERSA (use para não repetir perguntas e entender a intenção atual):
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
${checkoutBullets.map((line) => `• ${line}`).join("\n")}

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
