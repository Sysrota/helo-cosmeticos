import { useEffect } from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useClientesStore,
} from "@/stores/clientes.store";

import LoadingFincob
  from "../../../../components/LoadingFincob";

import EmptyStateFincob
  from "../../../../components/EmptyStateFincob";

import PaginationFincob
  from "../../../../components/PaginationFincob";

import Formatter
  from "../../../../utils/Formatter";

export default function ClientesPage() {

  const {
    clientes,
    loading,
    fetchClientes,
  } =
    useClientesStore();

  const navigate =
    useNavigate();

  useEffect(() => {

    fetchClientes();

  }, []);

  return (
    <div className="
      flex
      flex-col
      h-full
      overflow-hidden
    ">

      <div className="
        flex-1
        overflow-y-auto
        p-3
        md:p-4
      ">

        {loading && (
          <LoadingFincob />
        )}

        {!loading &&
          clientes.length === 0 && (

          <EmptyStateFincob
            titulo="
              Nenhum cliente encontrado
            "

            descricao="
              Os clientes aparecerão aqui.
            "
          />
        )}

        {/* MOBILE */}
        {!loading &&
          clientes.length > 0 && (

          <div className="
            flex
            flex-col
            gap-3
            md:hidden
          ">

            {clientes.map(
              (cliente) => (

                <div
                  key={cliente.id}

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

                  {/* TOPO */}
                  <div className="
                    flex
                    items-start
                    justify-between
                    gap-3
                  ">

                    <div className="
                      min-w-0
                    ">

                      <h2 className="
                        font-semibold
                        text-base
                        truncate
                      ">
                        {cliente.name ||
                          "Sem nome"}
                      </h2>

                      <p className="
                        text-sm
                        text-zinc-500
                        mt-1
                      ">
                        #{cliente.id}
                      </p>
                    </div>

                    <span className="
                      px-2
                      py-1
                      rounded-full
                      text-xs
                      bg-zinc-100
                      whitespace-nowrap
                    ">
                      {cliente.lead_status}
                    </span>
                  </div>

                  {/* INFO */}
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
                      gap-3
                    ">

                      <span className="
                        text-zinc-500
                      ">
                        Telefone
                      </span>

                      <span className="
                        text-right
                      ">
                        {Formatter.telefone(
                          cliente.phone
                        )}
                      </span>
                    </div>

                    <div className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <span className="
                        text-zinc-500
                      ">
                        Cidade
                      </span>

                      <span className="
                        text-right
                      ">
                        {cliente.city || "-"}
                      </span>
                    </div>

                    <div className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <span className="
                        text-zinc-500
                      ">
                        Total
                      </span>

                      <strong>
                        {Formatter.formataMoeda(
                          cliente.total_spent
                        )}
                      </strong>
                    </div>

                    <div className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    ">

                      <span className="
                        text-zinc-500
                      ">
                        IA
                      </span>

                      <span>
                        {cliente.blocked_ai
                          ? "Bloqueada"
                          : "Ativa"}
                      </span>
                    </div>
                  </div>

                  {/* AÇÃO */}
                  <button
                    onClick={() => {

                      navigate(
                        `/admin/clientes/${cliente.id}`
                      );
                    }}

                    className="
                      w-full
                      bg-black
                      text-white
                      py-2.5
                      rounded-xl
                      text-sm
                      font-medium
                    "
                  >
                    Abrir Cadastro
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* DESKTOP */}
        {!loading &&
          clientes.length > 0 && (

          <div className="
            hidden
            md:block
            bg-white
            rounded-2xl
            border
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
                      text-left
                      p-4
                    ">
                      Cliente
                    </th>

                    <th className="
                      text-left
                      p-4
                    ">
                      Telefone
                    </th>

                    <th className="
                      text-left
                      p-4
                    ">
                      Cidade
                    </th>

                    <th className="
                      text-left
                      p-4
                    ">
                      Status
                    </th>

                    <th className="
                      text-left
                      p-4
                    ">
                      Total
                    </th>

                    <th className="
                      text-left
                      p-4
                    ">
                      IA
                    </th>

                    <th className="
                      text-right
                      p-4
                    ">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {clientes.map(
                    (cliente) => (

                      <tr
                        key={cliente.id}

                        className="
                          border-b
                          hover:bg-zinc-50
                          transition-colors
                        "
                      >

                        <td className="p-4">

                          <div className="
                            flex
                            flex-col
                          ">

                            <strong>
                              {cliente.name ||
                                "Sem nome"}
                            </strong>

                            <span className="
                              text-xs
                              text-zinc-500
                            ">
                              #{cliente.id}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          {Formatter.telefone(
                            cliente.phone
                          )}
                        </td>

                        <td className="p-4">
                          {cliente.city || "-"}
                        </td>

                        <td className="p-4">

                          <span className="
                            px-2
                            py-1
                            rounded-full
                            text-xs
                            bg-zinc-100
                          ">
                            {cliente.lead_status}
                          </span>
                        </td>

                        <td className="p-4">
                          {Formatter.formataMoeda(
                            cliente.total_spent
                          )}
                        </td>

                        <td className="p-4">

                          {cliente.blocked_ai
                            ? "Bloqueada"
                            : "Ativa"}
                        </td>

                        <td className="
                          p-4
                          text-right
                        ">

                          <button
                            onClick={() => {

                              navigate(
                                `/admin/clientes/${cliente.id}`
                              );
                            }}

                            className="
                              text-sm
                              text-blue-600
                              hover:underline
                            "
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationFincob />
      </div>
    </div>
  );
}