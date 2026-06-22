import { useEffect, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";
import Formatter from "../../utils/Formatter";


const API_URL =
  import.meta.env.VITE_API_URL || "/api";

interface Order {
  id: number;

  status?: string;

  total?: number;

  created_at?: string;
}

interface Address {
  id?: number;

  cep?: string;

  street?: string;

  number?: string;

  district?: string;

  city?: string;

  state?: string;
}

interface Cliente {
  id: number;

  name?: string;

  phone?: string;

  email?: string;

  cpf?: string;

  birth_date?: string;

  notes?: string;

  lead_status?: string;

  total_spent?: number;

  blocked_ai?: boolean;

  priority?: boolean;

  orders?: Order[];

  addresses?: Address[];
}

export default function ClienteDetalhesPage() {

  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [cliente, setCliente] =
    useState<Cliente | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  async function load() {

    try {

      setLoading(true);

      const res =
        await fetch(
          `${API_URL}/contacts/${id}`
        );

      const data =
        await res.json();

      // GARANTE PELO MENOS 1 ENDEREÇO
      if (
        !data.addresses ||
        data.addresses.length === 0
      ) {

        data.addresses = [
          {},
        ];
      }

      setCliente(data);

    } finally {

      setLoading(false);
    }
  }

  async function saveCliente() {

    if (!cliente) {
      return;
    }

    try {

      setSaving(true);

      await fetch(
        `${API_URL}/contacts/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            cliente
          ),
        }
      );

      alert(
        "Cliente atualizado!"
      );

    } finally {

      setSaving(false);
    }
  }

  useEffect(() => {

    load();

  }, [id]);

  if (loading) {

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
      ">
        Carregando...
      </div>
    );
  }

  if (!cliente) {

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
      ">
        Cliente não encontrado
      </div>
    );
  }

  const address =
    cliente.addresses?.[0] || {};

  function updateAddress(
    field: keyof Address,
    value: string
  ) {

    const updatedAddress = {
      ...address,

      [field]:
        value,
    };

    setCliente((prev) => {

    if (!prev) {
        return prev;
    }

    return {
        ...prev,

        addresses: [
        updatedAddress,
        ],
    };
    });
  }

  function openAttendance() {
    const phone =
      Formatter.onlyNumbers(
        cliente.phone || ""
      );

    if (!phone) {
      alert(
        "Informe o telefone do cliente antes de iniciar o atendimento."
      );

      return;
    }

    const params =
      new URLSearchParams({
        phone,
        name:
          cliente.name || "",
      });

    navigate(
      `/admin/attendance?${params.toString()}`
    );
  }

  return (
    <div className="
      bg-zinc-100
      min-h-screen
      p-2
    ">

      <div className="
        max-w-1xl
        mx-auto
        flex
        flex-col
        gap-1
      ">

        {/* HEADER */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-6
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
        ">

          <div>

            <h1 className="
              text-2xl
              md:text-3xl
              font-bold
              break-words
            ">
              {cliente.name ||
                "Sem nome"}
            </h1>
          </div>

          <div className="
            flex
            flex-col
            sm:flex-row
            gap-3
            w-full
            lg:w-auto
          ">

            <button
              onClick={
                openAttendance
              }

              className="
                px-4
                py-2
                rounded-xl
                border
                w-full
                sm:w-auto
              "
            >
              Atendimento
            </button>

            <button
              onClick={() =>
                navigate(
                  "/admin/clientes"
                )
              }

              className="
                px-4
                py-2
                rounded-xl
                bg-zinc-200
                w-full
                sm:w-auto
              "
            >
              Voltar
            </button>

            <button
              onClick={saveCliente}

              disabled={saving}

              className="
                px-5
                py-2
                rounded-xl
                bg-black
                text-white
                w-full
                sm:w-auto
              "
            >
              {saving
                ? "Salvando..."
                : "Salvar"}
            </button>
          </div>
        </div>

        {/* GRID */}
        <div className="
          grid
          grid-cols-1
          xl:grid-cols-4
          gap-2
        ">

          {/* CADASTRO */}
          <div className="
            xl:col-span-3
            bg-white
            border
            rounded-2xl
            p-6
          ">

            <h2 className="
              text-xl
              font-semibold
              mb-3
            ">
              Cadastro
            </h2>

            <div className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-2
            ">

              {/* NOME */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Nome
                </label>

                <input
                  value={
                    cliente.name || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      name:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* TELEFONE */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Telefone
                </label>

                <input
                  value={
                    Formatter.telefone(
                      cliente.phone
                    ) || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      phone: Formatter.onlyNumbers(
                        e.target.value
                      ),
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* EMAIL */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  E-mail
                </label>

                <input
                  value={
                    cliente.email || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      email:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* CPF */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  CPF
                </label>

                <input
                  value={
                    cliente.cpf || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      cpf:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* CEP */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  CEP
                </label>

                <input
                  value={
                    address.cep || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "cep",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* RUA */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Rua
                </label>

                <input
                  value={
                    address.street || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "street",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* NÚMERO */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Número
                </label>

                <input
                  value={
                    address.number || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "number",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* BAIRRO */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Bairro
                </label>

                <input
                  value={
                    address.district || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "district",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* CIDADE */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Cidade
                </label>

                <input
                  value={
                    address.city || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "city",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* ESTADO */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Estado
                </label>

                <input
                  value={
                    address.state || ""
                  }

                  onChange={(e) =>
                    updateAddress(
                      "state",
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>

              {/* STATUS */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Status Lead
                </label>

                <select
                  value={
                    cliente.lead_status || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      lead_status:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                >

                  <option value="novo">
                    Novo
                  </option>

                  <option value="atendimento">
                    Atendimento
                  </option>

                  <option value="interessado">
                    Interessado
                  </option>

                  <option value="negociacao">
                    Negociação
                  </option>

                  <option value="cliente">
                    Cliente
                  </option>
                </select>
              </div>

              {/* NASCIMENTO */}
              <div>

                <label className="
                  text-sm
                  font-medium
                ">
                  Nascimento
                </label>

                <input
                  type="date"

                  value={
                    cliente.birth_date || ""
                  }

                  onChange={(e) =>
                    setCliente({
                      ...cliente,
                      birth_date:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    rounded-xl
                    px-3
                    py-2
                    mt-1
                  "
                />
              </div>
            </div>

            {/* OBS */}
            <div className="
              mt-6
            ">

              <label className="
                text-sm
                font-medium
              ">
                Observações
              </label>

              <textarea
                value={
                  cliente.notes || ""
                }

                onChange={(e) =>
                  setCliente({
                    ...cliente,
                    notes:
                      e.target.value,
                  })
                }

                rows={3}

                className="
                  w-full
                  border
                  rounded-xl
                  px-3
                  py-3
                  mt-1
                "
              />
            </div>
          </div>

          {/* LATERAL */}
          <div className="
            flex
            flex-col
            gap-6
          ">

            {/* RESUMO */}
            <div className="
              bg-white
              border
              rounded-2xl
              p-6
            ">

              <h2 className="
                text-lg
                font-semibold
                mb-5
              ">
                Resumo
              </h2>

              <div className="
                flex
                flex-col
                gap-4
                text-sm
              ">

                <div>

                  <span className="
                    text-zinc-500
                  ">
                    Total gasto
                  </span>

                  <p className="
                    text-xl
                    font-bold
                    mt-1
                  ">
                    R$ {Number(
                      cliente.total_spent || 0
                    ).toFixed(2)}
                  </p>
                </div>

                <div>

                  <span className="
                    text-zinc-500
                  ">
                    Pedidos
                  </span>

                  <p className="
                    text-xl
                    font-bold
                    mt-1
                  ">
                    {cliente.orders?.length || 0}
                  </p>
                </div>

                <label className="
                  flex
                  items-center
                  gap-2
                  mt-2
                ">

                  <input
                    type="checkbox"

                    checked={
                      cliente.priority || false
                    }

                    onChange={(e) =>
                      setCliente({
                        ...cliente,
                        priority:
                          e.target.checked,
                      })
                    }
                  />

                  Cliente prioritário
                </label>

                <label className="
                  flex
                  items-center
                  gap-2
                ">

                  <input
                    type="checkbox"

                    checked={
                      cliente.blocked_ai || false
                    }

                    onChange={(e) =>
                      setCliente({
                        ...cliente,
                        blocked_ai:
                          e.target.checked,
                      })
                    }
                  />

                  IA bloqueada
                </label>
              </div>
            </div>

            {/* PEDIDOS */}
            <div className="
              bg-white
              border
              rounded-2xl
              p-6
            ">

              <div className="
                flex
                items-center
                justify-between
                mb-4
              ">

                <h2 className="
                  text-lg
                  font-semibold
                ">
                  Pedidos
                </h2>

                <button className="
                  text-sm
                  text-blue-600
                ">
                  Novo
                </button>
              </div>

              {cliente.orders?.length === 0 && (

                <p className="
                  text-sm
                  text-zinc-500
                ">
                  Nenhum pedido
                </p>
              )}

              <div className="
                flex
                flex-col
                gap-3
              ">

                {cliente.orders?.map(
                  (order) => (

                    <div
                      key={order.id}

                      className="
                        border
                        rounded-xl
                        p-3
                      "
                    >

                      <div className="
                        flex
                        items-center
                        justify-between
                      ">

                        <strong>
                          #{order.order_number || order.id}
                        </strong>

                        <strong>
                          R$ {Number(
                            order.total || 0
                          ).toFixed(2)}
                        </strong>
                      </div>

                      <p className="
                        text-xs
                        text-zinc-500
                        mt-1
                      ">
                        {order.status}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
