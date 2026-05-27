import { prisma }
  from "../../../config/prisma.js";

const ignoredWords = [
  "oi",
  "oie",
  "ola",
  "olá",
  "boa",
  "bom",
  "dia",
  "tarde",
  "noite",
  "quero",
  "queria",
  "tem",
  "algo",
  "para",
  "pra",
  "de",
  "do",
  "da",
  "um",
  "uma",
  "e",
  "com",
  "mais",
  "menos",
];

export async function getProductsContext(
  message: string
) {

  const search =
    message.toLowerCase();

  // REMOVE PALAVRAS INÚTEIS
  const words =
    search
      .split(" ")
      .map(
        (word) =>
          word.trim()
      )
      .filter(
        (word) =>
          word.length > 2 &&
          !ignoredWords.includes(
            word
          )
      );

  if (!words.length) {
    return null;
  }

  const products =
    await prisma.product.findMany({
      where: {
        is_active: true,
      },

      take: 50,
    });

  // SCORE PRODUTOS
  const scoredProducts =
    products.map((product) => {

      const text = `
${product.title}
${product.category}
${product.description}
${product.keywords}
${product.dicas_uso}
${product.o_que_vai_sentir}
`
        .toLowerCase();

      let score = 0;

      for (const word of words) {

        // TITLE
        if (
          product.title
            .toLowerCase()
            .includes(word)
        ) {
          score += 10;
        }

        // KEYWORDS
        if (
          product.keywords
            ?.toLowerCase()
            .includes(word)
        ) {
          score += 8;
        }

        // CATEGORY
        if (
          product.category
            .toLowerCase()
            .includes(word)
        ) {
          score += 6;
        }

        // DESCRIPTION
        if (
          text.includes(word)
        ) {
          score += 2;
        }
      }

      return {
        product,
        score,
      };
    });

  // PRODUTOS RELEVANTES
  const matchedProducts =
    scoredProducts
      .filter(
        (item) =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .map(
        (item) =>
          item.product
      );

  // KITS RELACIONADOS
  const relatedKits =
    products.filter((product) => {

      const isKit =
        product.category
          .toLowerCase()
          .includes("kit");

      if (!isKit) {
        return false;
      }

      const text = `
${product.title}
${product.description}
${product.keywords}
`
        .toLowerCase();

      return matchedProducts.some(
        (matched) => {

          return (
            text.includes(
              matched.title
                .toLowerCase()
            ) ||

            matched.category
              .toLowerCase()
              .includes("skincare") &&

            text.includes(
              "skincare"
            )
          );
        }
      );
    });

  // REMOVE DUPLICADOS
  const finalProducts =
    [
      ...matchedProducts,
      ...relatedKits,
    ]
      .filter(
        (product, index, self) =>
          index ===
          self.findIndex(
            (p) =>
              p.id === product.id
          )
      )
      .sort(
        (a, b) =>
          a.price - b.price
      )
      .slice(0, 6);

  if (!finalProducts.length) {
    return null;
  }

  // SEPARA KITS
  const individualProducts =
    finalProducts.filter(
      (product) =>
        !product.category
          .toLowerCase()
          .includes("kit")
    );

  const kits =
    finalProducts.filter(
      (product) =>
        product.category
          .toLowerCase()
          .includes("kit")
    );

  let context = "";

  // INDIVIDUAIS
  if (
    individualProducts.length
  ) {

    context += `
PRODUTOS INDIVIDUAIS:
`;

    for (const product of individualProducts) {

      context += `
ID do produto: ${product.id}

Produto: ${product.title}

Preço: R$ ${product.price}

Categoria: ${product.category}

Descrição:
${product.description}

Dicas de uso:
${product.dicas_uso}

Indicado para / necessidades relacionadas:
${product.keywords || "Não informado"}

O que vai sentir:
${product.o_que_vai_sentir}

-------------------
`;
    }
  }

  // KITS
  if (kits.length) {

    context += `
KITS RELACIONADOS:
`;

    for (const product of kits) {

      context += `
ID do produto: ${product.id}

Produto: ${product.title}

Preço: R$ ${product.price}

Categoria: ${product.category}

Descrição:
${product.description}

Indicado para / necessidades relacionadas:
${product.keywords || "Não informado"}

-------------------
`;
    }
  }

  return context;
}
