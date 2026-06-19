import {
  useEffect,
  useState,
} from "react";
import Formatter from "../../utils/Formatter.js";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

export default function StoreSettingsPage() {

  const [config, setConfig] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  async function loadConfig() {

    const res =
      await fetch(
        `${API_URL}/store-config`
      );

    const data =
      await res.json();

    setConfig(data);
  }

  useEffect(() => {

    loadConfig();

  }, []);

  async function saveConfig() {

    try {

      setSaving(true);

      await fetch(
        `${API_URL}/store-config`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },

          body: JSON.stringify(
            config
          ),
        }
      );

      alert(
        "Configurações salvas!"
      );

    } catch (error) {

      console.log(error);

      alert(
        "Erro ao salvar"
      );

    } finally {

      setSaving(false);
    }
  }

  if (!config) {

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

  return (
    <div className="
      bg-zinc-100
      min-h-screen
      p-3
      md:p-6
    ">

      <div className="
        max-w-5xl
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
              Configurações da Loja
            </h1>

            <p className="
              text-zinc-500
              mt-1
            ">
              Operação da empresa
            </p>
          </div>

          <button
            onClick={saveConfig}

            disabled={saving}

            className="
              bg-black
              text-white

              px-5
              py-3

              rounded-xl
            "
          >
            {saving
              ? "Salvando..."
              : "Salvar"}
          </button>
        </div>

        {/* PAGAMENTOS */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-2
          ">
            Comercial
          </h2>

          <p className="mb-5 text-sm leading-6 text-zinc-500">
            Regras que aparecem no site, na IA e afetam checkout/pagamento.
          </p>

          <div className="
            flex
            flex-col
            gap-4
          ">

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-zinc-600">
                Desconto no PIX (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={config.pix_discount_percent ?? 10}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pix_discount_percent:
                        Number(e.target.value),
                    })
                  }
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                />
              </label>

              <label className="text-sm text-zinc-600">
                Parcelas sem juros
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={config.card_interest_free_installments ?? 3}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      card_interest_free_installments:
                        Number(e.target.value),
                    })
                  }
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                />
              </label>

              <label className="text-sm text-zinc-600">
                Máximo de parcelas
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={config.card_max_installments ?? 12}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      card_max_installments:
                        Number(e.target.value),
                    })
                  }
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                />
              </label>
            </div>

            <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              As parcelas sem juros divulgadas no site devem estar habilitadas
              também na sua conta do Mercado Pago; é o Mercado Pago quem
              confirma a cobrança sem juros no cartão.
            </p>

            {config.payment_methods?.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 text-zinc-600">
                Os métodos de pagamento cadastrados continuam salvos, mas o
                checkout usa as opções reais configuradas no Mercado Pago.
              </div>
            )}
          </div>
        </div>

        {/* FRETE */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-2
          ">
            Entrega
          </h2>

          <p className="mb-5 text-sm leading-6 text-zinc-500">
            O frete é calculado automaticamente pelo CEP no checkout. Aqui ficam
            apenas as regras que realmente mudam o cálculo.
          </p>

          <div className="
            flex
            flex-col
            gap-5
          ">

            <div>

              <label className="
                text-sm
                text-zinc-500
              ">
                Frete grátis em compras acima de (R$)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  config.free_shipping_minimum ?? 99
                }
                onChange={(e) =>
                  setConfig({
                    ...config,
                    free_shipping_minimum:
                      Number(e.target.value),
                  })
                }
                className="
                  mb-5
                  mt-2
                  h-12
                  w-full
                  rounded-xl
                  border
                  px-4
                "
              />

              <label className="mb-5 flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <input
                  type="checkbox"
                  checked={config.moto_uber_enabled ?? true}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      moto_uber_enabled:
                        e.target.checked,
                    })
                  }
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-medium text-zinc-900">
                    Disponibilizar retirada e Moto Uber
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-500">
                    Retirar em mãos grátis e Moto Uber ficam disponíveis para
                    Goiânia e região metropolitana. Acima do valor de frete
                    grátis, Moto Uber tem valor fixo de R$ 10,00; abaixo disso,
                    o valor é pago ao entregador.
                  </span>
                </span>
              </label>

              <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Transportadoras e valores são consultados automaticamente no
                cálculo de frete. Retirada e Moto Uber aparecem quando
                estiverem ativas e disponíveis para a região.
              </p>
            </div>
          </div>
        </div>

        {/* GESTORES */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-2
          ">
            Notificações para Gestores
          </h2>

          <p className="mb-5 text-sm leading-6 text-zinc-500">
            Números que recebem notificações administrativas da IA (vendas, pedidos etc).
            O gestor precisa enviar uma mensagem para a IA para abrir a janela de 24h.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-zinc-600">
              Gestor 1 — WhatsApp
              <input
                type="text"
                placeholder="(62) 9 9999-9999"
                value={Formatter.telefone(config.manager_phone_1 ?? "")}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    manager_phone_1: Formatter.onlyNumbers(e.target.value),
                  })
                }
                className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
              />
            </label>

            <label className="text-sm text-zinc-600">
              Gestor 2 — WhatsApp
              <input
                type="text"
                placeholder="(62) 9 9999-9999"
                value={Formatter.telefone(config.manager_phone_2 ?? "")}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    manager_phone_2: Formatter.onlyNumbers(e.target.value),
                  })
                }
                className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
              />
            </label>
          </div>

          <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
            A IA envia pings de renovação a cada 30 minutos após 19h sem resposta do gestor,
            para manter a janela de 24h ativa e evitar cobranças da Meta por mensagens template.
            Notificações enviadas fora da janela ficam na fila e são entregues quando o gestor responder.
          </p>
        </div>

        {/* ATENDIMENTO */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-2
          ">
            Atendimento e IA
          </h2>

          <p className="mb-5 text-sm leading-6 text-zinc-500">
            Textos usados para orientar a IA nas conversas com clientes.
          </p>

          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Horário comercial
          </label>

          <textarea
            value={
              config.business_hours
            }

            onChange={(e) =>
              setConfig({
                ...config,

                business_hours:
                  e.target.value,
              })
            }

            rows={4}

            className="
              w-full
              border
              rounded-2xl
              px-4
              py-3
            "
          />

          <label className="mb-2 mt-5 block text-sm font-medium text-zinc-700">
            Política de troca
          </label>

          <textarea
            value={
              config.exchange_policy
            }

            onChange={(e) =>
              setConfig({
                ...config,

                exchange_policy:
                  e.target.value,
              })
            }

            rows={5}

            className="
              w-full
              border
              rounded-2xl
              px-4
              py-3
            "
          />

          <label className="mb-2 mt-5 block text-sm font-medium text-zinc-700">
            Regras da IA
          </label>

          <textarea
            value={
              config.ai_rules
            }

            onChange={(e) =>
              setConfig({
                ...config,

                ai_rules:
                  e.target.value,
              })
            }

            rows={6}

            className="
              w-full
              border
              rounded-2xl
              px-4
              py-3
            "
          />
        </div>
      </div>
    </div>
  );
}
