import { Worker, Queue } from "bullmq";
import { redis } from "../../../config/redis.js";
import { prisma } from "../../../config/prisma.js";
import { sendWhatsAppMessage } from "../../whatsapp/services/meta.service.js";

const WINDOW_MS      = 24 * 60 * 60 * 1000;
const WARNING_MS     = 19 * 60 * 60 * 1000;
const PING_EVERY_MS  = 30 * 60 * 1000;
const CHECK_EVERY_MS =  5 * 60 * 1000;

const RENEWAL_MESSAGE =
  "Olá! Responda esta mensagem para manter as notificações da loja ativas. 🔔";

export const managerRenewalQueue = new Queue("manager-renewal", {
  connection: redis,
});

export const managerRenewalWorker = new Worker(
  "manager-renewal",
  async () => {
    const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });
    if (!config) return;

    const now = Date.now();

    const managers = [
      {
        phone:     config.manager_phone_1,
        windowAt:  config.manager_1_window_opened_at,
        lastPing:  config.manager_1_last_ping_at,
        pingField: "manager_1_last_ping_at" as const,
      },
      {
        phone:     config.manager_phone_2,
        windowAt:  config.manager_2_window_opened_at,
        lastPing:  config.manager_2_last_ping_at,
        pingField: "manager_2_last_ping_at" as const,
      },
    ];

    for (const m of managers) {
      if (!m.phone || !m.windowAt) continue;

      const elapsed = now - m.windowAt.getTime();

      // só age entre 19h e 24h
      if (elapsed < WARNING_MS || elapsed >= WINDOW_MS) continue;

      const lastPingAge = now - (m.lastPing?.getTime() ?? 0);
      if (lastPingAge < PING_EVERY_MS) continue;

      try {
        await sendWhatsAppMessage(m.phone, RENEWAL_MESSAGE);
        await prisma.storeConfig.update({
          where: { id: 1 },
          data: { [m.pingField]: new Date() },
        });
        console.log(`[manager-renewal] ping enviado para ${m.phone}`);
      } catch (e) {
        console.error("[manager-renewal] erro ao enviar ping:", e);
      }
    }
  },
  { connection: redis }
);

// Job repetitivo que verifica a cada 5 minutos
managerRenewalQueue.add(
  "check-windows",
  {},
  {
    repeat:   { every: CHECK_EVERY_MS },
    jobId:    "manager-renewal-check",
  }
);
