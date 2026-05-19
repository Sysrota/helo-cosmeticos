import { Request, Response } from "express";

import { prisma } from "../../config/prisma.js";

export async function createProductImageController(
  req: Request,
  res: Response
) {
  const productId =
    Number(req.params.id);

  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado",
    });
  }

  const {
    image_url,
    sort_order = 0,
  } = req.body;

  if (!image_url) {
    return res.status(400).json({
      error:
        "image_url é obrigatório",
    });
  }

  const image =
    await prisma.productImage.create({
      data: {
        product_id:
          productId,

        image_url,

        sort_order:
          Number(sort_order) || 0,
      },
    });

  return res.status(201).json(image);
}

export async function updateProductImageController(
  req: Request,
  res: Response
) {
  const imageId =
    Number(req.params.imageId);

  const {
    sort_order,
  } = req.body;

  const image =
    await prisma.productImage.update({
      where: {
        id: imageId,
      },

      data: {
        sort_order:
          Number(sort_order) || 0,
      },
    });

  return res.json(image);
}

export async function deleteProductImageController(
  req: Request,
  res: Response
) {
  const imageId =
    Number(req.params.imageId);

  await prisma.productImage.delete({
    where: {
      id: imageId,
    },
  });

  return res.status(204).send();
}