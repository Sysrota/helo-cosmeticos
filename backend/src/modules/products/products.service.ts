import { prisma } from "../../config/prisma.js";

export async function findAllProducts() {
  const products =
    await prisma.product.findMany({
      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },

      orderBy: {
        created_at: "desc",
      },
    });

    console.log(products);

    return products.map(
      (product) => ({
        ...product,

        image_url:
          product.images?.[0]
            ?.image_url ||
          product.image_url ||
          "",
      })
    );
}

export async function findProductById(
  id: number
) {
  return prisma.product.findUnique({
    where: {
      id,
    },

    include: {
      images: {
        orderBy: {
          sort_order: "asc",
        },
      },
    },
  });
}

interface CreateProductDTO {
  title: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  dicas_uso?: string;
  o_que_vai_sentir?: string;
  is_active?: boolean;
}

export async function createProduct(
  data: CreateProductDTO
) {
  return prisma.product.create({
    data: {
      title: data.title,

      description: data.description ?? "",

      price: data.price,

      category: data.category,

      image_url: data.image_url ?? "",

      dicas_uso: data.dicas_uso ?? "",

      o_que_vai_sentir:
        data.o_que_vai_sentir ?? "",

      is_active: data.is_active ?? true,
    },
  });
}

interface UpdateProductDTO {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  dicas_uso?: string;
  o_que_vai_sentir?: string;
  is_active?: boolean;
}

export async function updateProduct(
  id: number,
  data: UpdateProductDTO
) {
  return prisma.product.update({
    where: {
      id,
    },

    data,
  });
}

export async function deleteProduct(
  id: number
) {
  return prisma.product.delete({
    where: {
      id,
    },
  });
}