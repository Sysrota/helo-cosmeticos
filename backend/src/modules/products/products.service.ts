import { prisma } from "../../config/prisma.js";

interface FindAllProductsOptions {
  active?: boolean;
  category?: string;
  featured?: boolean;
  limit?: number;
  search?: string;
  sort?: "new" | "low" | "high";
}

export async function findAllProducts(
  options: FindAllProductsOptions = {}
) {
  const orderBy =
    options.sort === "low"
      ? { price: "asc" as const }
      : options.sort === "high"
        ? { price: "desc" as const }
        : { created_at: "desc" as const };

  const products =
    await prisma.product.findMany({
      where: {
        ...(typeof options.active === "boolean"
          ? { is_active: options.active }
          : {}),
        ...(options.category && options.category !== "all"
          ? { category: options.category }
          : {}),
        ...(typeof options.featured === "boolean"
          ? { is_featured: options.featured }
          : {}),
        ...(options.search
          ? {
              title: {
                contains: options.search,
                mode: "insensitive",
              } as const,
            }
          : {}),
      },
      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },

      orderBy,
      ...(options.limit ? { take: options.limit } : {}),
    });


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
  is_featured?: boolean;
  keywords?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
}

export async function createProduct(
  data: CreateProductDTO
) {
  return prisma.$transaction(async (transaction) => {
    if (data.is_featured) {
      await transaction.product.updateMany({
        where: { is_featured: true },
        data: { is_featured: false },
      });
    }

    return transaction.product.create({
      data: {
        title: data.title,
        description: data.description ?? "",
        price: data.price,
        category: data.category,
        image_url: data.image_url ?? "",
        dicas_uso: data.dicas_uso ?? "",
        o_que_vai_sentir: data.o_que_vai_sentir ?? "",
        is_active: data.is_active ?? true,
        is_featured: data.is_featured ?? false,
        keywords: data.keywords ?? "",
        weight: data.weight ?? 0,
        height: data.height ?? 0,
        width: data.width ?? 0,
        length: data.length ?? 0,
      },
    });
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
  is_featured?: boolean;
  keywords?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
}

export async function updateProduct(
  id: number,
  data: UpdateProductDTO
) {
  return prisma.$transaction(async (transaction) => {
    if (data.is_featured) {
      await transaction.product.updateMany({
        where: {
          is_featured: true,
          NOT: { id },
        },
        data: { is_featured: false },
      });
    }

    return transaction.product.update({
      where: { id },
      data,
    });
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
