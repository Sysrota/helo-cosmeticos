import { prisma } from "../../config/prisma.js";
import { sendWhatsAppMessage } from "../whatsapp/services/meta.service.js";

const WINDOW_MS = 24 * 60 * 60 * 1000;

function isWindowOpen(openedAt: Date | null | undefined): boolean {
  if (!openedAt) return false;
  return Date.now() - openedAt.getTime() < WINDOW_MS;
}

export async function renewManagerWindow(phone: string) {
  const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  if (phone === config.manager_phone_1) {
    await prisma.storeConfig.update({
      where: { id: 1 },
      data: {
        manager_1_window_opened_at: new Date(),
        manager_1_last_ping_at: null,
      },
    });
    await drainManagerQueue(phone);
  } else if (phone === config.manager_phone_2) {
    await prisma.storeConfig.update({
      where: { id: 1 },
      data: {
        manager_2_window_opened_at: new Date(),
        manager_2_last_ping_at: null,
      },
    });
    await drainManagerQueue(phone);
  }
}

export async function sendOrQueueNotification(content: string) {
  const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const managers = [
    { phone: config.manager_phone_1, windowAt: config.manager_1_window_opened_at },
    { phone: config.manager_phone_2, windowAt: config.manager_2_window_opened_at },
  ].filter((m) => !!m.phone);

  for (const manager of managers) {
    if (isWindowOpen(manager.windowAt)) {
      try {
        await sendWhatsAppMessage(manager.phone!, content);
      } catch (e) {
        console.error("Erro ao enviar notificação para gestor:", e);
        await prisma.managerNotification.create({
          data: { phone: manager.phone!, content },
        });
      }
    } else {
      await prisma.managerNotification.create({
        data: { phone: manager.phone!, content },
      });
    }
  }
}

async function drainManagerQueue(phone: string) {
  const pending = await prisma.managerNotification.findMany({
    where: { phone, sent_at: null },
    orderBy: { created_at: "asc" },
  });

  for (const notification of pending) {
    try {
      await sendWhatsAppMessage(phone, notification.content);
      await prisma.managerNotification.update({
        where: { id: notification.id },
        data: { sent_at: new Date() },
      });
    } catch (e) {
      console.error("Erro ao enviar notificação pendente:", e);
    }
  }
}
