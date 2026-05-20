import { Request, Response } from "express";

import {
  createConversation,
  createMessage,
  listConversations,
  listMessages,
  markConversationAsRead,
} from "./attendance.service.js";
import { createConversationSchema, createMessageSchema } from "./attendance.validators.js";

export async function listConversationsController(
  _req: Request,
  res: Response
) {
  const conversations =
    await listConversations();

  return res.json(conversations);
}

export async function createConversationController(
  req: Request,
  res: Response
) {
  const parsed =
    createConversationSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const conversation =
    await createConversation(
      parsed.data
    );

  return res.status(201).json(
    conversation
  );
}

export async function createMessageController(
  req: Request,
  res: Response
) {
  const parsed =
    createMessageSchema.safeParse(
      req.body
    );

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const message =
    await createMessage(
      parsed.data
    );

  return res.status(201).json(
    message
  );
}

export async function listMessagesController(
  req: Request,
  res: Response
) {
  const conversationId =
    Number(req.params.id);

  const messages =
    await listMessages(
      conversationId
    );

  return res.json(messages);
}

export async function markAsReadController(
  req: Request,
  res: Response
) {
  const conversationId =
    Number(req.params.id);

  const conversation =
    await markConversationAsRead(
      conversationId
    );

  return res.json(conversation);
}

export async function
uploadAttendanceFileController(
  req: Request,
  res: Response
) {

  if (!req.file) {
    return res.status(400).json({
      error: "Arquivo não enviado",
    });
  }

  const conversationId =
    Number(
      req.body.conversation_id
    );

  const mimeType =
    req.file.mimetype;

  let type = "document";

  if (
    mimeType.startsWith("image/")
  ) {
    type = "image";
  }

  if (
    mimeType.startsWith("audio/")
  ) {
    type = "audio";
  }

  const message =
    await createMessage({
      conversation_id:
        conversationId,

      sender_type: "agent",

      content:
        req.file.originalname,

      media_url:
        `/uploads/${req.file.filename}`,

      type,
    });

  return res.json(message);
}