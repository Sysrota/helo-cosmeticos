import { z } from "zod";

export const createConversationSchema =
  z.object({
    phone: z.string(),

    name: z.string().optional(),
  });

  export const createMessageSchema =
  z.object({
    conversation_id:
      z.number(),

    sender_type:
      z.string(),

    content:
      z.string(),

    type:
      z.string().optional(),

    media_url:
      z.string().optional(),
  });