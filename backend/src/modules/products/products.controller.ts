import { Request, Response } from "express";

import {
  findAllProducts,
  findProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.service.js";

import { createProductSchema, updateProductSchema } from "./products.validators.js";


export async function listProducts(
  _req: Request,
  res: Response
) {
  const products = await findAllProducts();

  return res.json({
    items: products,
  });
}

export async function getProduct(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  const product = await findProductById(id);

  if (!product) {
    return res.status(404).json({
      error: "Produto não encontrado",
    });
  }

  return res.json({
    ...product,

    images:
      product.images || [],
  });
}

export async function storeProduct(
  req: Request,
  res: Response
) {
  const parsed =
    createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const product = await createProduct(
    parsed.data
  );

  return res.status(201).json(product);
}

export async function updateProductController(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  const parsed =
    updateProductSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const exists =
    await findProductById(id);

  if (!exists) {
    return res.status(404).json({
      error: "Produto não encontrado",
    });
  }

  const product = await updateProduct(
    id,
    parsed.data
  );

  return res.json(product);
}

export async function deleteProductController(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  const exists =
    await findProductById(id);

  if (!exists) {
    return res.status(404).json({
      error: "Produto não encontrado",
    });
  }

  await deleteProduct(id);

  return res.status(204).send();
}