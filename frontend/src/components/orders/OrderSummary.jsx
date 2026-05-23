import Formatter
  from "@/utils/Formatter";

export function OrderSummary({
  subtotal,
  order,
  total,
  setOrder,
}) {

  return (
    <div className="
      bg-white

      border
      border-zinc-200

      rounded-3xl

      p-5

      sticky
      top-4

      self-start
    ">

      {/* HEADER */}
      <div className="
        mb-5
      ">

        <h2 className="
          text-2xl
          font-bold
        ">
          Resumo
        </h2>

        <p className="
          text-zinc-500
          mt-1
          text-sm
        ">
          Informações financeiras do pedido
        </p>
      </div>

      {/* VALUES */}
      <div className="
        flex
        flex-col
        gap-4
      ">

        {/* SUBTOTAL */}
        <div className="
          flex
          items-center
          justify-between
        ">

          <span className="
            text-zinc-500
          ">
            Subtotal
          </span>

          <strong>
            {Formatter.formataMoeda(
              subtotal
            )}
          </strong>
        </div>

        {/* SHIPPING */}
        <div className="
          flex
          items-center
          justify-between
        ">

          <span className="
            text-zinc-500
          ">
            Frete
          </span>

          <strong>
            {Formatter.formataMoeda(
              order.shipping || 0
            )}
          </strong>
        </div>

        {/* DISCOUNT */}
        <div>

          <label className="
            text-sm
            text-zinc-500
          ">
            Desconto
          </label>

          <input
            type="number"

            value={
              order.discount || 0
            }

            onChange={(e) =>
              setOrder({
                ...order,

                discount:
                  Number(
                    e.target.value
                  ),
              })
            }

            className="
              w-full

              border
              border-zinc-200

              rounded-2xl

              px-4
              py-3

              mt-2
            "
          />
        </div>

        {/* TOTAL */}
        <div className="
          border-t
          pt-4

          flex
          items-center
          justify-between
        ">

          <span className="
            text-lg
            font-semibold
          ">
            Total
          </span>

          <strong className="
            text-2xl
            font-bold
          ">
            {Formatter.formataMoeda(
              total
            )}
          </strong>
        </div>

        {/* STATUS */}
        <div className="
          border-t
          pt-4
        ">

          <div className="
            text-sm
            text-zinc-500
            mb-2
          ">
            Status do Pedido
          </div>

          <select
            value={order.status}

            onChange={(e) =>
              setOrder({
                ...order,

                status:
                  e.target.value,
              })
            }

            className="
              w-full

              border
              border-zinc-200

              rounded-2xl

              px-4
              py-3
            "
          >

            <option value="pending">
              Pendente
            </option>

            <option value="paid">
              Pago
            </option>

            <option value="shipping">
              Enviando
            </option>

            <option value="finished">
              Finalizado
            </option>

            <option value="cancelled">
              Cancelado
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}