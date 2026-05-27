import { createPixPaymentService } from "../../payment-mercado-pago/create-pix-payment.service.js";

interface Props {
  orderId: number;
}

export async function generatePixTool({
  orderId,
}: Props) {

  const payment =
    await createPixPaymentService({
      order_id: orderId,
    });

  return {

    payment_id:
      payment.payment_id,

    qr_code:
      payment.qr_code,

    qr_code_base64:
      payment.qr_code_base64,
  };
}
