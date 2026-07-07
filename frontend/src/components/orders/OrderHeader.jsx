import {
  useNavigate,
} from "react-router-dom";
import {
  useMemo,
  useState,
} from "react";

function getOrderDisplayNumber(order) {
  return order?.order_number || order?.id;
}

function onlyDigits(value) {
  return String(value || "")
    .replace(/\D/g, "");
}

function buildCustomerWhatsAppUrl({
  phone,
  message,
}) {
  const digits =
    onlyDigits(phone);

  if (!digits) {
    return "";
  }

  const phoneWithCountry =
    digits.startsWith("55")
      ? digits
      : `55${digits}`;

  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
}

export function OrderHeader({
  order,
  saveOrder,
  savingOrder = false,
}) {

  const navigate =
    useNavigate();

  const [copyFeedback,
    setCopyFeedback] =
    useState("");

  const orderLink =
    useMemo(() => {
      if (!order) {
        return "";
      }

      return `${window.location.origin}/checkout/${getOrderDisplayNumber(order)}`;
    }, [order]);

  const checkoutMessage =
    useMemo(() => {
      const name =
        order?.contact?.name?.split(" ")?.[0] ||
        "";

      const greeting =
        name
          ? `Oi, ${name}!`
          : "Oi!";

      return `${greeting} Aqui está o link do seu pedido Helô para concluir o pagamento:\n${orderLink}`;
    }, [order, orderLink]);

  async function copyOrderLink() {
    if (!orderLink) {
      return;
    }

    await navigator.clipboard.writeText(
      orderLink
    );

    setCopyFeedback(
      "Link copiado"
    );

    setTimeout(() => {
      setCopyFeedback("");
    }, 2500);
  }

  function openCustomerWhatsApp() {
    const url =
      buildCustomerWhatsAppUrl({
        phone:
          order?.contact?.phone,
        message:
          checkoutMessage,
      });

    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const hasCustomerPhone =
    Boolean(
      onlyDigits(
        order?.contact?.phone
      )
    );

  return (
    <div className="
      bg-white
      rounded-2xl
      border
      border-zinc-200
      p-4

      flex
      xl:flex-row

      xl:items-center
      xl:justify-between

    ">

      <div>

        <div className="
          flex
          items-center
          gap-3
        ">

          <h1 className="
            text-3xl
            font-bold
            text-zinc-900
          ">
            Pedido #{getOrderDisplayNumber(order)}
          </h1>

          <span className={`
            px-3
            py-1
            rounded-full
            text-sm
            font-semibold

            ${
              order.payment_status ===
              "paid"

                ? `
                  bg-green-100
                  text-green-700
                `
                : `
                  bg-yellow-100
                  text-yellow-700
                `
            }
          `}>
            {
              order.payment_status ===
              "paid"

                ? "Pago"

                : "Pendente"
            }
          </span>
        </div>

        <p className="
          text-zinc-500
          mt-2
        ">
          {order.contact?.name}
        </p>
      </div>

      <div className="
        flex
        flex-col
        sm:flex-row
        sm:flex-wrap
        gap-3
      ">
        <button
          onClick={copyOrderLink}

          className="
            px-5
            py-3
            rounded-2xl
            bg-pink-100
            text-pink-700
            font-semibold
          "
        >
          {copyFeedback || "Copiar link"}
        </button>

        <button
          onClick={openCustomerWhatsApp}
          disabled={!hasCustomerPhone}

          className="
            px-5
            py-3
            rounded-2xl
            bg-green-600
            text-white
            font-semibold
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          Enviar WhatsApp
        </button>

        <button
          onClick={() =>
            navigate(
              "/admin/orders"
            )
          }

          className="
            px-5
            py-3
            rounded-2xl
            bg-zinc-200
            font-medium
          "
        >
          Voltar
        </button>

        <button
          onClick={saveOrder}
          disabled={savingOrder}

          className="
            px-5
            py-3
            rounded-2xl
            bg-black
            text-white
            font-semibold
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {savingOrder
            ? "Salvando..."
            : "Salvar Pedido"}
        </button>
      </div>
    </div>
  );
}
