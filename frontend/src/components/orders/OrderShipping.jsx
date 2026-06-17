import Formatter
  from "@/utils/Formatter";

export function OrderShipping({
  cep,
  setCep,
  calculateShipping,
  loadingShipping,
  shippingOptions,
  order,
  setOrder,
}) {

  return (
    <div className="
      bg-white
      rounded-2xl
      border
      border-zinc-200
      p-3
    ">

      {/* HEADER */}
      <div className="
        mb-5
      ">

        <h2 className="
          text-2xl
          font-bold
        ">
          Frete
        </h2>

        <p className="
          text-zinc-500
          mt-1
        ">
          Calcule e selecione a transportadora
        </p>
      </div>

      {/* CEP */}
      <div className="
        flex
        flex-col
        gap-4
      ">
        <input
          value={Formatter.cep(cep)}
          onChange={(e) =>
            setCep(
              e.target.value
            )
          }
          placeholder="
            Digite o CEP
          "

          className="
            flex-1

            border
            border-zinc-200

            rounded-2xl

            px-5
            py-2

            outline-none

            focus:border-black
          "
        />

        <button
          onClick={
            calculateShipping
          }

          disabled={
            loadingShipping
          }

          className="
            px-6
            py-2

            rounded-2xl

            bg-black
            text-white

            font-semibold

            whitespace-nowrap
          "
        >
          {
            loadingShipping

              ? "Calculando..."

              : "Calcular Frete"
          }
        </button>
      </div>

      {/* OPÇÕES */}
      {shippingOptions.length >
        0 && (

        <div className="
          mt-2
          flex
          flex-col
          gap-1
        ">

          {shippingOptions.map(
            (option, index) => {

              const selected =
                order.shipping_method ===
                option.name;

              return (

                <button
                  key={index}

                  onClick={() => {

                    setOrder({
                      ...order,

                      shipping:
                        option.price,

                      shipping_method:
                        option.name,

                      shipping_price:
                        option.price,

                      shipping_deadline:
                        option.deadline,
                    });
                  }}

                  className={`
                    border

                    rounded-2xl

                    p-3

                    flex
                    items-top
                    justify-between

                    transition-all

                    ${
                      selected

                        ? `
                          border-black
                          bg-zinc-100
                        `

                        : `
                          border-zinc-200
                          hover:bg-zinc-50
                        `
                    }
                  `}
                >

                  {/* LEFT */}
                  <div className="
                    text-left
                  ">

                    <div className="
                      text-sm
                      font-bold
                    ">
                      {option.name}
                    </div>

                    <div className="
                      text-sm
                      text-zinc-500
                      mt-1
                    ">
                      Entrega em{" "}
                      {
                        option.deadline
                      }
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="
                    text-right
                  ">

                    <div className="
                      text-xl
                      font-bold
                    ">
                      {Formatter.formataMoeda(
                        option.price
                      )}
                    </div>

                    {selected && (

                      <div className="
                        text-green-600
                        text-sm
                        font-medium
                        mt-1
                      ">
                        Selecionado
                      </div>
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}

      {/* {order.shipping_method && (

        <div className="
          mt-6

          border-t
          pt-6

          flex
          flex-col
          gap-2
        ">

          <div className="
            flex
            items-top
            justify-between
          ">

            <span className="
              text-zinc-500
            ">
              Transportadora
            </span>

            <strong>
              {
                order.shipping_method
              }
            </strong>
          </div>

          <div className="
            flex
            items-center
            justify-between
          ">

            <span className="
              text-zinc-500
            ">
              Prazo
            </span>

            <strong>
              {
                order.shipping_deadline
              }
            </strong>
          </div>

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

            <strong className="
              text-xl
            ">
              {Formatter.formataMoeda(
                order.shipping_price || 0
              )}
            </strong>
          </div>
        </div>
      )} */}
    </div>
  );
}
