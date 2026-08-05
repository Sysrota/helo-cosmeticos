import { Request, Response } from "express";

import { prisma } from "../../config/prisma.js";
import { scheduleProductSeoGeneration } from "./product-seo.service.js";

// Vincula um produto já cadastrado no catálogo como item do kit — nome,
// imagem e descrição vêm sempre do produto vinculado, nunca digitados aqui.
export async function createKitItemController(
  req: Request,
  res: Response
) {
  const productId = Number(req.params.id);
  const itemProductId = Number(req.body.item_product_id);
  const sortOrder = Number(req.body.sort_order) || 0;

  if (!itemProductId) {
    return res.status(400).json({
      error: "item_product_id é obrigatório",
    });
  }

  if (itemProductId === productId) {
    return res.status(400).json({
      error: "Um produto não pode ser item de si mesmo",
    });
  }

  const [product, itemProduct] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.product.findUnique({ where: { id: itemProductId } }),
  ]);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado",
    });
  }

  if (!itemProduct) {
    return res.status(404).json({
      error: "Produto do item não encontrado",
    });
  }

  try {
    const kitItem = await prisma.productKitItem.create({
      data: {
        product_id: productId,
        item_product_id: itemProductId,
        sort_order: sortOrder,
      },
      include: {
        item_product: {
          include: {
            images: { orderBy: { sort_order: "asc" } },
          },
        },
      },
    });

    scheduleProductSeoGeneration(
      `item de kit criado para produto ${productId}`
    );

    return res.status(201).json(kitItem);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return res.status(409).json({
        error: "Este produto já está no kit",
      });
    }

    throw error;
  }
}

export async function updateKitItemController(
  req: Request,
  res: Response
) {
  const kitItemId = Number(req.params.kitItemId);
  const { sort_order } = req.body;

  const kitItem = await prisma.productKitItem.update({
    where: { id: kitItemId },
    data: {
      ...(sort_order !== undefined
        ? { sort_order: Number(sort_order) || 0 }
        : {}),
    },
  });

  scheduleProductSeoGeneration(
    `item de kit atualizado para produto ${kitItem.product_id}`
  );

  return res.json(kitItem);
}

export async function deleteKitItemController(
  req: Request,
  res: Response
) {
  const kitItemId = Number(req.params.kitItemId);

  const kitItem = await prisma.productKitItem.delete({
    where: { id: kitItemId },
  });

  scheduleProductSeoGeneration(
    `item de kit removido do produto ${kitItem.product_id}`
  );

  return res.status(204).send();
}
