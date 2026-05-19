import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(2),

  description: z.string().optional().default(""),

  price: z.number().positive(),

  category: z.string(),

  image_url: z.string().optional().default(""),

  dicas_uso: z.string().optional().default(""),

  o_que_vai_sentir: z.string().optional().default(""),

  is_active: z.boolean().optional().default(true),
});

export const updateProductSchema =
  createProductSchema.partial();