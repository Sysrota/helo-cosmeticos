import { prisma } from "../../config/prisma.js";

interface FindAllProductsOptions {
  active?: boolean;
  category?: string;
  featured?: boolean;
  limit?: number;
  search?: string;
  sort?: "display" | "new" | "low" | "high";
}

export async function findAllProducts(
  options: FindAllProductsOptions = {}
) {
  const orderBy =
    options.sort === "low"
      ? { price: "asc" as const }
      : options.sort === "high"
        ? { price: "desc" as const }
        : options.sort === "new"
          ? { created_at: "desc" as const }
          : [
              { sort_order: "asc" as const },
              { created_at: "desc" as const },
            ];

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
              OR: [
                {
                  title: {
                    contains: options.search,
                    mode: "insensitive",
                  },
                },
                {
                  subtitle: {
                    contains: options.search,
                    mode: "insensitive",
                  },
                },
              ] as const,
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
  subtitle?: string;
  meta_description?: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  dicas_uso?: string;
  o_que_vai_sentir?: string;
  composicao?: string;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  keywords?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  lot_quantity?: number;
  production_cost_total?: number;
  packaging_cost_total?: number;
  labels_cost_total?: number;
  shipping_materials_cost_total?: number;
  factory_freight_cost_total?: number;
  payment_fee_percent?: number;
  sales_tax_percent?: number;
  company_shipping_cost_avg?: number;
  customer_acquisition_cost_avg?: number;
  desired_profit_margin_percent?: number;
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

    const lastProduct =
      await transaction.product.findFirst({
        orderBy: {
          sort_order: "desc",
        },
        select: {
          sort_order: true,
        },
      });

    return transaction.product.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? "",
        meta_description: data.meta_description ?? "",
        description: data.description ?? "",
        price: data.price,
        category: data.category,
        image_url: data.image_url ?? "",
        dicas_uso: data.dicas_uso ?? "",
        o_que_vai_sentir: data.o_que_vai_sentir ?? "",
        composicao: data.composicao ?? "",
        is_active: data.is_active ?? true,
        is_featured: data.is_featured ?? false,
        sort_order:
          data.sort_order ??
          ((lastProduct?.sort_order ?? -1) + 1),
        keywords: data.keywords ?? "",
        weight: data.weight ?? 0,
        height: data.height ?? 0,
        width: data.width ?? 0,
        length: data.length ?? 0,
        lot_quantity: data.lot_quantity ?? 0,
        production_cost_total: data.production_cost_total ?? 0,
        packaging_cost_total: data.packaging_cost_total ?? 0,
        labels_cost_total: data.labels_cost_total ?? 0,
        shipping_materials_cost_total: data.shipping_materials_cost_total ?? 0,
        factory_freight_cost_total: data.factory_freight_cost_total ?? 0,
        payment_fee_percent: data.payment_fee_percent ?? 0,
        sales_tax_percent: data.sales_tax_percent ?? 0,
        company_shipping_cost_avg: data.company_shipping_cost_avg ?? 0,
        customer_acquisition_cost_avg: data.customer_acquisition_cost_avg ?? 0,
        desired_profit_margin_percent: data.desired_profit_margin_percent ?? 0,
      },
    });
  });
}

interface UpdateProductDTO {
  title?: string;
  subtitle?: string;
  meta_description?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  dicas_uso?: string;
  o_que_vai_sentir?: string;
  composicao?: string;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  keywords?: string;
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  lot_quantity?: number;
  production_cost_total?: number;
  packaging_cost_total?: number;
  labels_cost_total?: number;
  shipping_materials_cost_total?: number;
  factory_freight_cost_total?: number;
  payment_fee_percent?: number;
  sales_tax_percent?: number;
  company_shipping_cost_avg?: number;
  customer_acquisition_cost_avg?: number;
  desired_profit_margin_percent?: number;
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

export async function reorderProducts(
  items: Array<{
    id: number;
    sort_order: number;
  }>
) {
  return prisma.$transaction(
    items.map((item) =>
      prisma.product.update({
        where: {
          id: item.id,
        },
        data: {
          sort_order: item.sort_order,
        },
      })
    )
  );
}
