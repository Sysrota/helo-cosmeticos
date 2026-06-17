import {
  useEffect,
  useState,
} from "react";

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
            mb-5
          ">
            Pagamentos
          </h2>

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

            {config.payment_methods?.map(
              (method, index) => (

                <div
                  key={method.id}

                  className="
                    flex
                    items-center
                    justify-between

                    border
                    rounded-2xl
                    p-4
                  "
                >

                  <div>

                    <div className="
                      font-medium
                    ">
                      {method.label}
                    </div>

                    <div className="
                      text-sm
                      text-zinc-500
                    ">
                      Método de pagamento
                    </div>
                  </div>

                  <input
                    type="checkbox"

                    checked={
                      method.enabled
                    }

                    onChange={(e) => {

                      const updated =
                        [
                          ...config.payment_methods,
                        ];

                      updated[index] = {
                        ...updated[index],

                        enabled:
                          e.target.checked,
                      };

                      setConfig({
                        ...config,

                        payment_methods:
                          updated,
                      });
                    }}

                    className="
                      w-5
                      h-5
                    "
                  />
                </div>
              )
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
            mb-5
          ">
            Frete
          </h2>

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
                    Disponibilizar entrega por Moto Uber
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-500">
                    Disponível para Goiânia e região metropolitana com valor
                    fixo de R$ 10,00 cobrado no checkout.
                  </span>
                </span>
              </label>

              <label className="
                text-sm
                text-zinc-500
              ">
                Informações de frete
              </label>

              <textarea
                value={
                  config.shipping_info
                }

                onChange={(e) =>
                  setConfig({
                    ...config,

                    shipping_info:
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
                  mt-2
                "
              />
            </div>

            <div className="
              flex
              flex-col
              gap-4
            ">

              {config.shipping_methods?.map(
                (method) => (

                  <div
                    key={method.id}

                    className="
                      border
                      rounded-2xl
                      p-4
                    "
                  >

                    <div className="
                      font-medium
                    ">
                      {method.label}
                    </div>

                    <div className="
                      text-sm
                      text-zinc-500
                      mt-1
                    ">
                      Transportadora
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* HORÁRIO */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-5
          ">
            Horário Comercial
          </h2>

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
        </div>

        {/* TROCAS */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-5
          ">
            Política de Troca
          </h2>

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
        </div>

        {/* IA */}
        <div className="
          bg-white
          border
          rounded-2xl
          p-5
        ">

          <h2 className="
            text-xl
            font-semibold
            mb-5
          ">
            Regras da IA
          </h2>

          <p className="mb-4 text-sm leading-6 text-zinc-500">
            Use este campo para orientações de atendimento. Frete, PIX e
            parcelamento são definidos nos campos acima.
          </p>

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
