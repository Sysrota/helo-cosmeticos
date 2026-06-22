import {
  useEffect,
  useState,
} from "react";

import { useNavigate }
  from "react-router-dom";

import Formatter
  from "../../utils/Formatter";

const API_URL =
  import.meta.env.VITE_API_URL;

function orderStatusLabel(status) {
  const labels = {
    pending: "Pendente",
    paid: "Pago",
    preparing: "Em preparo",
    shipping: "Enviando",
    finished: "Entregue",
    cancelled: "Cancelado",
  };

  return labels[status] || status || "Não informado";
}

export default function OrdersPage() {

  const navigate =
    useNavigate();

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  async function loadOrders() {

    try {

      setLoading(true);

      const res =
        await fetch(
          `${API_URL}/orders`
        );

      const data =
        await res.json();

      setOrders(data);

    } finally {

      setLoading(false);
    }
  }

  useEffect(() => {

    loadOrders();

  }, []);

  return (
    <div className="
      bg-zinc-100
      min-h-screen
      p-3
      md:p-6
    ">

      <div className="
        max-w-7xl
        mx-auto
        flex
        flex-col
        gap-6
      ">

        {/* HEADER */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
          md:p-6

          flex
          flex-col
          md:flex-row

          md:items-center
          md:justify-between

          gap-4
        ">

          <div>

            <h1 className="
              text-2xl
              md:text-3xl
              font-bold
            ">
              Pedidos
            </h1>

            <p className="
              text-zinc-500
              mt-1
            ">
              Gestão de vendas
            </p>
          </div>

          <button
            className="
              bg-black
              text-white

              px-5
              py-3

              rounded-xl

              text-sm
              font-medium
            "
          >
            Novo Pedido
          </button>
        </div>

        {/* MOBILE */}
        {!loading && (

          <div className="
            flex
            flex-col
            gap-3
            md:hidden
          ">

            {orders.map((order) => (

              <div
                key={order.id}

                className="
                  bg-white
                  border
                  rounded-2xl
                  p-4
                  flex
                  flex-col
                  gap-4
                "
              >

                <div className="
                  flex
                  items-start
                  justify-between
                  gap-3
                ">

                  <div>

                    <h2 className="
                      font-semibold
                    ">
                      Pedido #{order.id}
                    </h2>

                    <p className="
                      text-sm
                      text-zinc-500
                      mt-1
                    ">
                      {
                        order.contact?.name
                      }
                    </p>
                  </div>

                  <span className="
                    px-2
                    py-1
                    rounded-full
                    bg-zinc-100
                    text-xs
                  ">
                    {orderStatusLabel(order.status)}
                  </span>
                </div>

                <div className="
                  flex
                  flex-col
                  gap-2
                  text-sm
                ">

                  <div className="
                    flex
                    items-center
                    justify-between
                  ">

                    <span className="
                      text-zinc-500
                    ">
                      Itens
                    </span>

                    <strong>
                      {
                        order.items?.length
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
                      Total
                    </span>

                    <strong>
                      {Formatter.formataMoeda(
                        order.total
                      )}
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
                      Data
                    </span>

                    <span>
                      {new Date(
                        order.created_at
                      ).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {

                    navigate(
                      `/admin/orders/${order.id}`
                    );
                  }}

                  className="
                    w-full
                    bg-black
                    text-white
                    py-2.5
                    rounded-xl
                    text-sm
                  "
                >
                  Abrir Pedido
                </button>
              </div>
            ))}
          </div>
        )}

        {/* DESKTOP */}
        {!loading && (

          <div className="
            hidden
            md:block

            bg-white
            border
            rounded-2xl
            overflow-hidden
          ">

            <div className="
              overflow-x-auto
            ">

              <table className="
                w-full
                text-sm
              ">

                <thead className="
                  bg-zinc-50
                  border-b
                ">

                  <tr>

                    <th className="
                      p-4
                      text-left
                    ">
                      Pedido
                    </th>

                    <th className="
                      p-4
                      text-left
                    ">
                      Cliente
                    </th>

                    <th className="
                      p-4
                      text-left
                    ">
                      Status
                    </th>

                    <th className="
                      p-4
                      text-left
                    ">
                      Itens
                    </th>

                    <th className="
                      p-4
                      text-left
                    ">
                      Total
                    </th>

                    <th className="
                      p-4
                      text-left
                    ">
                      Data
                    </th>

                    <th className="
                      p-4
                      text-right
                    ">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {orders.map((order) => (

                    <tr
                      key={order.id}

                      className="
                        border-b
                        hover:bg-zinc-50
                      "
                    >

                      <td className="p-4">
                        #{order.id}
                      </td>

                      <td className="p-4">
                        {
                          order.contact?.name
                        }
                      </td>

                      <td className="p-4">

                        <span className="
                          px-2
                          py-1
                          rounded-full
                          bg-zinc-100
                          text-xs
                        ">
                          {orderStatusLabel(order.status)}
                        </span>
                      </td>

                      <td className="p-4">
                        {
                          order.items?.length
                        }
                      </td>

                      <td className="p-4">
                        {Formatter.formataMoeda(
                          order.total
                        )}
                      </td>

                      <td className="p-4">
                        {new Date(
                          order.created_at
                        ).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>

                      <td className="
                        p-4
                        text-right
                      ">

                        <button
                          onClick={() => {

                            navigate(
                              `/admin/orders/${order.id}`
                            );
                          }}

                          className="
                            text-blue-600
                            hover:underline
                          "
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
