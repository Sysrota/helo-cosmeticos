import { z } from "zod";

export const productCreateSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  price: z.number().positive(), // em reais no input
  category: z.string().min(2),
  is_active: z.boolean().optional().default(true),
  image_url: z.string().optional().default(""),

  dicas_uso: z.string().optional().default(""),
  o_que_vai_sentir: z.string().optional().default(""),
});

export const productUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  category: z.string().min(2).optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().optional(),

  dicas_uso: z.string().optional(),
  o_que_vai_sentir: z.string().optional(),
});
