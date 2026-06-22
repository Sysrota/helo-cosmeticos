import type {
  Prisma,
} from "@prisma/client";

function currentSaoPauloYear() {
  return Number(
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Sao_Paulo",
        year:
          "numeric",
      }
    ).format(new Date())
  );
}

export function formatOrderNumber(
  year: number,
  sequence: number
) {
  return `${String(year).slice(-2)}${String(sequence).padStart(4, "0")}`;
}

export async function generateOrderNumber(
  transaction: Prisma.TransactionClient
) {
  const year =
    currentSaoPauloYear();

  const rows =
    await transaction.$queryRaw<
      {
        last_number: number;
      }[]
    >`
      INSERT INTO "order_sequences" ("year", "last_number", "updated_at")
      VALUES (${year}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("year")
      DO UPDATE SET
        "last_number" = "order_sequences"."last_number" + 1,
        "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_number"
    `;

  return formatOrderNumber(
    year,
    Number(rows[0]?.last_number || 1)
  );
}

export function getOrderDisplayNumber(
  order: {
    id: number;
    order_number?: string | null;
  }
) {
  return order.order_number || String(order.id);
}
