import Formatter
  from "@/utils/Formatter";
  
const API_URL =
  import.meta.env.VITE_API_URL; 

export function OrderItemsTable({
  items,
  updateQuantity,
  removeItem,
}) {

  return (
    <div className="
      bg-white
      rounded-2xl
      border
      border-zinc-200
      overflow-hidden
    ">

      <div className="
        p-3
        border-b
      ">

        <h2 className="
          text-2xl
          font-bold
        ">
          Produtos
        </h2>

        <p className="
          text-zinc-500
          mt-1
        ">
          Produtos adicionados ao pedido
        </p>
      </div>

      {/* DESKTOP */}
      <div className="
        hidden
        lg:block
        overflow-x-auto
      ">

        <table className="
          w-full
        ">
          <thead className="
            bg-zinc-50
            text-zinc-500
            text-sm
          ">

            <tr>

              <th className="
                p-3
                text-left
              ">
                Produto
              </th>

              <th className="
                p-3
                text-center
              ">
                Quantidade
              </th>

              <th className="
                p-3
                text-right
              ">
                Unitário
              </th>

              <th className="
                p-3
                text-right
              ">
                Subtotal
              </th>

              <th className="
                p-3
              " />
            </tr>
          </thead>

          <tbody>

            {items?.map((item) => (

              <tr
                key={item.product_id}
                className="
                  border-t
                "
              >

                {/* PRODUTO */}
                <td className="
                  p-3
                ">

                  <div className="
                    flex
                    items-center
                    gap-2
                  ">

                    <div className="
                      w-16
                      h-16
                      rounded-2xl
                      bg-zinc-100
                      shrink-0
                    ">

                      {item.product
                        ?.images?.[0] && (

                        <img
                          src={`${API_URL}${item.product.image_url}`}

                          alt={
                            item.product
                              ?.title
                          }

                          className="
                            w-full
                            h-full
                            object-cover
                            rounded-2xl
                          "
                        />
                      )}
                    </div>

                    <div>

                      <div className="
                        font-semibold
                        text-zinc-900
                      ">
                        {
                          item.product
                            ?.title
                        }
                      </div>

                      <div className="
                        text-sm
                        text-zinc-500
                        mt-1
                      ">
                        ID #
                        {
                          item.product_id
                        }
                      </div>
                    </div>
                  </div>
                </td>

                {/* QUANTIDADE */}
                <td className="
                  p-3
                  text-center
                ">

                  <input
                    type="number"

                    min={1}

                    value={
                      item.quantity
                    }

                    onChange={(e) =>
                      updateQuantity(
                        item.product_id,

                        Number(
                          e.target
                            .value
                        )
                      )
                    }

                    className="
                      w-24
                      border
                      rounded-xl
                      px-3
                      py-2
                      text-center
                    "
                  />
                </td>

                {/* PREÇO */}
                <td className="
                  p-4
                  text-right
                  font-medium
                ">
                  {Formatter.formataMoeda(
                    item.unit_price
                  )}
                </td>

                {/* SUBTOTAL */}
                <td className="
                  p-4
                  text-right
                  font-bold
                ">
                  {Formatter.formataMoeda(
                    item.unit_price *
                    item.quantity
                  )}
                </td>

                {/* REMOVER */}
                <td className="
                  p-4
                  text-right
                ">

                  <button
                    onClick={() =>
                      removeItem(
                        item.product_id
                      )
                    }

                    className="
                      text-red-500
                      hover:text-red-700
                      font-medium
                    "
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="
        lg:hidden
        flex
        flex-col
      ">

        {items?.map((item) => (

          <div
            key={item.product_id}

            className="
              border-t
              p-4

              flex
              flex-col
              gap-4
            "
          >

            <div className="
              flex
              items-center
              gap-4
            ">

              <div className="
                w-16
                h-16
                rounded-2xl
                bg-zinc-100
                shrink-0
              ">

{
  item.product?.image_url && (

    <img
      src={`
        ${API_URL}
        ${item.product.image_url}
      `}

      alt={
        item.product.title
      }

      className="
        w-20
        h-20
        rounded-2xl
        object-cover
      "
    />
  )
}
              </div>

              <div className="
                flex-1
              ">

                <div className="
                  font-semibold
                ">
                  {
                    item.product
                      ?.title
                  }
                </div>

                <div className="
                  text-sm
                  text-zinc-500
                  mt-1
                ">
                  {Formatter.formataMoeda(
                    item.unit_price
                  )}
                </div>
              </div>
            </div>

            <div className="
              flex
              items-center
              justify-between
            ">

              <input
                type="number"

                min={1}

                value={
                  item.quantity
                }

                onChange={(e) =>
                  updateQuantity(
                    item.product_id,

                    Number(
                      e.target
                        .value
                    )
                  )
                }

                className="
                  w-24
                  border
                  rounded-xl
                  px-3
                  py-2
                  text-center
                "
              />

              <div className="
                text-right
              ">

                <div className="
                  font-bold
                ">
                  {Formatter.formataMoeda(
                    item.unit_price *
                    item.quantity
                  )}
                </div>

                <button
                  onClick={() =>
                    removeItem(
                      item.product_id
                    )
                  }

                  className="
                    text-red-500
                    text-sm
                    mt-1
                  "
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}