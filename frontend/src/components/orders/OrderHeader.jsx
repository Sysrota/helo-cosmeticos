import {
  useNavigate,
} from "react-router-dom";

function getOrderDisplayNumber(order) {
  return order?.order_number || order?.id;
}

export function OrderHeader({
  order,
  saveOrder,
  savingOrder = false,
}) {

  const navigate =
    useNavigate();

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
        gap-3
      ">

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
