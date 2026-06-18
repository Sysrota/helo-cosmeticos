import { Request, Response } from "express";

import {
  findAllProducts,
  findProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.service.js";
import { scheduleProductSeoGeneration } from "./product-seo.service.js";

import { createProductSchema, updateProductSchema } from "./products.validators.js";


export async function listProducts(
  req: Request,
  res: Response
) {
  const rawLimit = Number(req.query.limit);
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : undefined;
  const active =
    req.query.active === "true"
      ? true
      : req.query.active === "false"
        ? false
        : undefined;
  const featured =
    req.query.featured === "true"
      ? true
      : req.query.featured === "false"
        ? false
        : undefined;
  const sort =
    req.query.sort === "low" || req.query.sort === "high"
      ? req.query.sort
      : "new";
  const category =
    typeof req.query.category === "string"
      ? req.query.category
      : undefined;
  const search =
    typeof req.query.search === "string"
      ? req.query.search.trim()
      : undefined;

  const products = await findAllProducts({
    active,
    category,
    featured,
    limit,
    search,
    sort,
  });

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

  scheduleProductSeoGeneration(
    `produto criado ${product.id}`
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

  scheduleProductSeoGeneration(
    `produto atualizado ${id}`
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

  scheduleProductSeoGeneration(
    `produto excluído ${id}`
  );

  return res.status(204).send();
}
