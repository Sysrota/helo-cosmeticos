import { Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma.js";
import { roundMoney } from "./coupon-totals.service.js";

const PAID_STATUSES = [
  "paid",
  "approved",
];

const BRAND_COLOR =
  "#d9536f";

function effectiveOrderDate(
  order: any
) {
  return (
    order.paid_at ||
    order.created_at
  );
}

function isPaidRedemption(
  redemption: any
) {
  return PAID_STATUSES.includes(
    String(
      redemption.order.payment_status ||
      redemption.order.status ||
      redemption.status
    )
  );
}

function endOfDay(
  date: Date
) {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

function formatDate(
  value: Date | string | null | undefined
) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(
    "pt-BR"
  );
}

function formatMoney(
  value: number
) {
  return Number(
    value || 0
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export async function streamCommissionStatementPdf(
  res: Response,
  couponId: number,
  periodStart: Date | null,
  periodEnd: Date | null
) {
  const coupon =
    await prisma.coupon.findUnique({
      where: {
        id: couponId,
      },
      include: {
        redemptions: {
          include: {
            order: true,
            contact: true,
          },
        },
        commission_payouts: {
          orderBy: {
            period_end:
              "asc",
          },
        },
      },
    });

  if (!coupon) {
    throw new Error(
      "Cupom não encontrado."
    );
  }

  const periodEndLimit =
    periodEnd
      ? endOfDay(periodEnd)
      : null;

  const orders =
    coupon.redemptions
      .filter(isPaidRedemption)
      .filter((redemption) => {
        const date =
          new Date(
            effectiveOrderDate(
              redemption.order
            )
          );

        if (
          periodStart &&
          date < periodStart
        ) {
          return false;
        }

        if (
          periodEndLimit &&
          date > periodEndLimit
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(
            effectiveOrderDate(a.order)
          ).getTime() -
          new Date(
            effectiveOrderDate(b.order)
          ).getTime()
      );

  const paidSubtotal =
    roundMoney(
      orders.reduce(
        (sum, redemption) =>
          sum +
          Number(
            redemption.order.subtotal || 0
          ),
        0
      )
    );

  const commissionTotal =
    roundMoney(
      paidSubtotal *
      (
        Number(
          coupon.commission_percent || 0
        ) /
        100
      )
    );

  const doc =
    new PDFDocument({
      size: "A4",
      margin: 48,
    });

  res.setHeader(
    "Content-Type",
    "application/pdf"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="comissao-${coupon.code.toLowerCase()}.pdf"`
  );

  doc.pipe(res);

  doc
    .fontSize(18)
    .fillColor(BRAND_COLOR)
    .text("Helo Cosméticos");

  doc
    .fontSize(13)
    .fillColor("#111111")
    .text(
      "Prestação de contas — comissão de influencer",
      {
        paragraphGap: 10,
      }
    );

  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#444444");
  doc.text(
    `Influencer: ${coupon.partner_name || "-"}`
  );

  if (coupon.partner_email) {
    doc.text(
      `E-mail: ${coupon.partner_email}`
    );
  }

  doc.text(
    `Cupom: ${coupon.code}`
  );
  doc.text(
    `Comissão: ${Number(coupon.commission_percent || 0)}%`
  );
  doc.text(
    `Período: ${periodStart ? formatDate(periodStart) : "início"} até ${
      periodEnd ? formatDate(periodEnd) : "hoje"
    }`
  );
  doc.text(
    `Emitido em: ${formatDate(new Date())}`
  );

  doc.moveDown();

  const columns = [
    {
      label: "Pedido",
      width: 90,
    },
    {
      label: "Data",
      width: 80,
    },
    {
      label: "Subtotal",
      width: 100,
    },
    {
      label: "Comissão",
      width: 100,
    },
  ];
  const tableWidth =
    columns.reduce(
      (sum, column) =>
        sum + column.width,
      0
    );
  const tableX =
    doc.x;

  function drawHeader(
    y: number
  ) {
    doc
      .rect(
        tableX,
        y,
        tableWidth,
        20
      )
      .fill(BRAND_COLOR);

    let cursorX =
      tableX + 6;

    doc
      .fontSize(10)
      .fillColor("#ffffff");

    columns.forEach((column) => {
      doc.text(
        column.label,
        cursorX,
        y + 5,
        {
          width:
            column.width - 6,
        }
      );
      cursorX += column.width;
    });

    return y + 20;
  }

  let rowY =
    drawHeader(doc.y);

  doc
    .fontSize(9)
    .fillColor("#222222");

  if (!orders.length) {
    doc.text(
      "Nenhum pedido pago encontrado no período.",
      tableX,
      rowY + 4
    );
    rowY += 20;
  }

  orders.forEach((redemption, index) => {
    if (rowY > 760) {
      doc.addPage();
      rowY =
        drawHeader(48);
    }

    if (index % 2 === 0) {
      doc
        .rect(
          tableX,
          rowY,
          tableWidth,
          16
        )
        .fill("#f7f7f7");
    }

    doc.fillColor("#222222");

    const orderCommission =
      roundMoney(
        Number(
          redemption.order.subtotal || 0
        ) *
        (
          Number(
            coupon.commission_percent || 0
          ) /
          100
        )
      );

    let cursorX =
      tableX + 6;

    doc.text(
      redemption.order.order_number ||
        `#${redemption.order.id}`,
      cursorX,
      rowY + 3,
      {
        width:
          columns[0].width - 6,
      }
    );
    cursorX += columns[0].width;

    doc.text(
      formatDate(
        effectiveOrderDate(
          redemption.order
        )
      ),
      cursorX,
      rowY + 3,
      {
        width:
          columns[1].width - 6,
      }
    );
    cursorX += columns[1].width;

    doc.text(
      formatMoney(
        redemption.order.subtotal
      ),
      cursorX,
      rowY + 3,
      {
        width:
          columns[2].width - 6,
      }
    );
    cursorX += columns[2].width;

    doc.text(
      formatMoney(
        orderCommission
      ),
      cursorX,
      rowY + 3,
      {
        width:
          columns[3].width - 6,
      }
    );

    rowY += 16;
  });

  doc.y = rowY + 16;
  doc.x = tableX;

  doc
    .fontSize(11)
    .fillColor("#111111");
  doc.text(
    `Pedidos considerados: ${orders.length}`
  );
  doc.text(
    `Subtotal pago: ${formatMoney(paidSubtotal)}`
  );

  doc
    .fontSize(13)
    .fillColor(BRAND_COLOR);
  doc.text(
    `Comissão total do período: ${formatMoney(commissionTotal)}`,
    {
      paragraphGap: 10,
    }
  );

  if (coupon.commission_payouts.length) {
    doc.moveDown();
    doc
      .fontSize(11)
      .fillColor("#111111")
      .text(
        "Histórico de pagamentos"
      );

    doc
      .fontSize(9)
      .fillColor("#444444");

    coupon.commission_payouts.forEach((payout) => {
      doc.text(
        `${formatDate(payout.period_start)} a ${formatDate(payout.period_end)} — pago em ${formatDate(payout.paid_at)} — ${formatMoney(payout.commission_amount)}`
      );
    });
  }

  doc.end();
}
