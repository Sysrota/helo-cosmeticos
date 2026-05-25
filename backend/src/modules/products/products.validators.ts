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

  is_featured: z.boolean().optional().default(false),

  keywords: z.string().optional().default(""),
  weight: z.number().optional().default(0),
  height: z.number().optional().default(0),
  width: z.number().optional().default(0),
  length: z.number().optional().default(0),
});

export const updateProductSchema =
  createProductSchema.partial();
