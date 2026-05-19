import { prisma } from "../../config/prisma.js";

interface CreateProductImageDTO {
  product_id: number;

  image_url: string;

  sort_order?: number;
}

export async function createProductImage(
  data: CreateProductImageDTO
) {
  return prisma.productImage.create({
    data: {
      product_id:
        data.product_id,

      image_url:
        data.image_url,

      sort_order:
        data.sort_order ?? 0,
    },
  });
}

export async function updateProductImage(
  imageId: number,
  data: {
    sort_order?: number;
  }
) {
  return prisma.productImage.update({
    where: {
      id: imageId,
    },

    data,
  });
}

export async function deleteProductImage(
  imageId: number
) {
  return prisma.productImage.delete({
    where: {
      id: imageId,
    },
  });
}