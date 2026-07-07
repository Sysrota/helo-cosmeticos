import { Request, Response } from "express";

import {
  createConversation,
  createMessage,
  deleteConversation,
  listConversations,
  listMessages,
  markConversationAsRead,
  updateConversationAiMode,
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

export async function deleteConversationController(
  req: Request,
  res: Response
) {
  const conversationId =
    Number(req.params.id);

  if (
    !Number.isInteger(conversationId) ||
    conversationId <= 0
  ) {
    return res.status(400).json({
      error: "Conversa inválida",
    });
  }

  const deleted =
    await deleteConversation(
      conversationId
    );

  if (!deleted) {
    return res.status(404).json({
      error: "Conversa não encontrada",
    });
  }

  return res.status(204).send();
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

export async function updateAiModeController(
  req: Request,
  res: Response
) {
  const conversationId =
    Number(req.params.id);

  if (
    !Number.isInteger(conversationId) ||
    conversationId <= 0
  ) {
    return res.status(400).json({
      error: "Conversa inválida",
    });
  }

  const blockedAi =
    Boolean(req.body?.blocked_ai);

  const conversation =
    await updateConversationAiMode(
      conversationId,
      blockedAi
    );

  if (!conversation) {
    return res.status(404).json({
      error: "Conversa não encontrada",
    });
  }

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

      block_ai:
        true,
    });

  return res.json(message);
}
