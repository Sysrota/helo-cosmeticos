import { useNavigate } from "react-router-dom";
import {
  useAttendanceStore,
} from "../store/attendance.store";

export function CustomerPanel() {
  const {
    selectedConversation,
  } = useAttendanceStore();

  const navigate =
    useNavigate();

  if (!selectedConversation) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400">
        Nenhum cliente selecionado
      </div>
    );
  }

  const contact =
    selectedConversation.contact;

  async function createOrder() {
    if (!contact?.id) {
      return;
    }

    try {

      const res =
        await fetch(
          `${import.meta.env.VITE_API_URL}/orders`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              contact_id:
                contact.id,

              items: [],
            }),
          }
        );

      const order =
        await res.json();

      navigate(
        `/admin/orders/${order.id}`
      );

    } catch (error) {

      console.log(error);

      alert(
        "Erro ao criar pedido"
      );
    }
  }

  return (
    <div className="h-full flex flex-col p-6 bg-transparent">
      <div className="flex flex-col items-center border-b pb-6">
        <div
          className="
            w-24
            h-24
            rounded-full
           bg-[#f5e7df]
           text-[#5c4033]
            flex
            items-center
            justify-center
            text-3xl
            font-bold
          "
        >
          {contact?.name
            ?.charAt(0)
            ?.toUpperCase() || "C"}
        </div>

        <h2 className="mt-4 text-xl font-bold">
          {contact?.name ||
            "Sem nome"}
        </h2>

        <p className="text-zinc-500">
          {contact?.phone}
        </p>

        <div className="
            flex
            flex-col
            gap-3
            mt-5
            w-full
          ">

            <button
              onClick={createOrder}

              className="
                w-full

                bg-black
                text-white

                py-3

                rounded-2xl

                font-medium
              "
            >
              Novo Pedido
            </button>

            <button
              onClick={() => {

                navigate(
                  `/admin/clientes/${contact.id}`
                );
              }}

              className="
                w-full

                border

                py-3

                rounded-2xl

                font-medium
              "
            >
              Abrir Cadastro
            </button>
          </div>

        <span
          className="
            mt-3
            px-3
            py-1
            rounded-full
            bg-green-100
            text-green-700
            text-sm
          "
        >
          Online
        </span>
      </div>

      <div className="py-6 space-y-4">
        <div>
          <div className="text-sm text-zinc-400">
            Status
          </div>

          <div className="font-medium">
            {
              selectedConversation.status
            }
          </div>
        </div>

        <div>
          <div className="text-sm text-zinc-400">
            Última mensagem
          </div>

          <div className="font-medium">
            {selectedConversation.last_message ||
              "-"}
          </div>
        </div>

        <div>
          <div className="text-sm text-zinc-400">
            Canal
          </div>

          <div className="font-medium">
            WhatsApp
          </div>
        </div>
      </div>
    </div>
  );
}