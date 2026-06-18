import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(2),

  subtitle: z.string().optional().default(""),

  meta_description: z.string().optional().default(""),

  description: z.string().optional().default(""),

  price: z.number().positive(),

  category: z.string(),

  image_url: z.string().optional().default(""),

  dicas_uso: z.string().optional().default(""),

  o_que_vai_sentir: z.string().optional().default(""),

  is_active: z.boolean().optional().default(true),

  is_featured: z.boolean().optional().default(false),

  sort_order: z.number().int().optional(),

  keywords: z.string().optional().default(""),
  weight: z.number().optional().default(0),
  height: z.number().optional().default(0),
  width: z.number().optional().default(0),
  length: z.number().optional().default(0),
  lot_quantity: z.number().int().min(0).optional().default(0),
  production_cost_total: z.number().min(0).optional().default(0),
  packaging_cost_total: z.number().min(0).optional().default(0),
  labels_cost_total: z.number().min(0).optional().default(0),
  shipping_materials_cost_total: z.number().min(0).optional().default(0),
  factory_freight_cost_total: z.number().min(0).optional().default(0),
  payment_fee_percent: z.number().min(0).max(100).optional().default(0),
  sales_tax_percent: z.number().min(0).max(100).optional().default(0),
  company_shipping_cost_avg: z.number().min(0).optional().default(0),
  customer_acquisition_cost_avg: z.number().min(0).optional().default(0),
  desired_profit_margin_percent: z.number().min(0).max(100).optional().default(0),
});

export const updateProductSchema =
  createProductSchema.partial();

export const reorderProductsSchema =
  z.object({
    items: z.array(
      z.object({
        id: z.number().int().positive(),
        sort_order: z.number().int().min(0),
      })
    ).min(1),
  });
