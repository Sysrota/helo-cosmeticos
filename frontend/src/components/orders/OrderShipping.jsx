import Formatter
  from "@/utils/Formatter";

function formatShippingOptionPrice(option) {
  if (
    Number(option?.price || 0) === 0
  ) {
    return "Grátis";
  }

  return Formatter.formataMoeda(
    option.price
  );
}

const shippingStatusLabels = {
  created: "Etiqueta criada",
  pending: "Pendente",
  released: "Etiqueta paga",
  generated: "Etiqueta gerada",
  received: "Recebido na distribuição",
  posted: "Postado",
  delivered: "Entregue",
  undelivered: "Não entregue",
  paused: "Pausado",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

function getShippingStatusLabel(status) {
  return (
    shippingStatusLabels[status] ||
    status ||
    "Não informado"
  );
}

function TrackingInfoItem({
  label,
  value,
  href,
}) {
  const displayValue =
    value || "Não informado";

  return (
    <div className="
      rounded-2xl
      border
      border-zinc-200
      bg-white
      px-4
      py-3
    ">
      <p className="
        text-xs
        font-semibold
        text-zinc-500
      ">
        {label}
      </p>

      {href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="
            mt-1
            block
            break-all
            text-sm
            font-semibold
            text-zinc-900
            underline
          "
        >
          {displayValue}
        </a>
      ) : (
        <p className="
          mt-1
          break-all
          text-sm
          font-semibold
          text-zinc-900
        ">
          {displayValue}
        </p>
      )}
    </div>
  );
}

export function OrderShipping({
  cep,
  setCep,
  calculateShipping,
  loadingShipping,
  shippingOptions,
  order,
  selectShippingOption,
  generateMelhorEnvioLabel,
  loadingMelhorEnvioLabel,
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

      {order.shipping_method && (
        <div className="
          mb-4
          rounded-2xl
          border
          border-emerald-200
          bg-emerald-50
          p-4
        ">
          <div className="
            flex
            items-start
            justify-between
            gap-4
          ">
            <div>
              <p className="
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-emerald-700
              ">
                Frete selecionado
              </p>

              <p className="
                mt-1
                text-base
                font-bold
                text-zinc-900
              ">
                {order.shipping_method}
              </p>

              {order.shipping_deadline && (
                <p className="
                  mt-1
                  text-sm
                  text-zinc-600
                ">
                  {order.shipping_deadline}
                </p>
              )}

              {order.melhor_envio_service_id && (
                <p className="
                  mt-1
                  text-xs
                  font-medium
                  text-zinc-500
                ">
                  Serviço Melhor Envio: {order.melhor_envio_service_id}
                </p>
              )}
            </div>

            <div className="
              text-right
            ">
              <p className="
                text-xs
                font-semibold
                text-zinc-500
              ">
                Cobrado do cliente
              </p>

              <p className="
                mt-1
                text-xl
                font-bold
                text-zinc-900
              ">
                {Number(order.shipping_price ?? order.shipping ?? 0) === 0
                  ? "Grátis"
                  : Formatter.formataMoeda(
                      order.shipping_price ??
                      order.shipping
                )}
              </p>

              <p className="
                mt-3
                text-xs
                font-semibold
                text-zinc-500
              ">
                Custo para a loja
              </p>

              <p className="
                mt-1
                text-lg
                font-bold
                text-zinc-900
              ">
                {Formatter.formataMoeda(
                  order.shipping_cost ??
                  order.shipping_price ??
                  order.shipping ??
                  0
                )}
              </p>
            </div>
          </div>
        </div>
      )}

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

                  onClick={() =>
                    selectShippingOption(
                      option
                    )
                  }

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
                      {Number(option.original_price) >
                        Number(option.price) && (
                        <div className="
                          text-xs
                          font-medium
                          text-zinc-400
                          line-through
                        ">
                          {Formatter.formataMoeda(
                            option.original_price
                          )}
                        </div>
                      )}

                      {formatShippingOptionPrice(
                        option
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

      <div className="
        mt-5
        border-t
        border-zinc-200
        pt-5
      ">

        <h3 className="
          text-lg
          font-bold
        ">
          Rastreamento
        </h3>

        <p className="
          mt-1
          text-sm
          text-zinc-500
        ">
          Dados preenchidos automaticamente pelo Melhor Envio.
        </p>

        <div className="
          mt-4
          grid
          grid-cols-1
          gap-3
        ">
          <div className="
            grid
            grid-cols-1
            gap-3
            md:grid-cols-2
          ">
            <TrackingInfoItem
              label="Código de rastreio"
              value={order.tracking_code}
            />

            <TrackingInfoItem
              label="Link de rastreio"
              value={order.tracking_url}
              href={order.tracking_url}
            />

            <TrackingInfoItem
              label="Status logístico"
              value={getShippingStatusLabel(
                order.shipping_status
              )}
            />

            <TrackingInfoItem
              label="Protocolo Melhor Envio"
              value={order.melhor_envio_protocol}
            />

            <TrackingInfoItem
              label="ID da etiqueta Melhor Envio"
              value={order.melhor_envio_order_id}
            />

            <TrackingInfoItem
              label="Serviço Melhor Envio"
              value={
                order.melhor_envio_service_id
                  ? String(order.melhor_envio_service_id)
                  : ""
              }
            />
          </div>

          <TrackingInfoItem
            label="Link de impressão da etiqueta"
            value={order.melhor_envio_print_url}
            href={order.melhor_envio_print_url}
          />

          <div className="
            flex
            flex-col
            gap-2
            rounded-2xl
            border
            border-zinc-200
            bg-zinc-50
            p-4
          ">
            <button
              type="button"
              onClick={generateMelhorEnvioLabel}
              disabled={
                loadingMelhorEnvioLabel ||
                Boolean(order.melhor_envio_order_id)
              }
              className="
                rounded-2xl
                bg-black
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loadingMelhorEnvioLabel
                ? "Gerando etiqueta..."
                : order.melhor_envio_order_id
                  ? "Etiqueta já gerada"
                  : "Gerar etiqueta Melhor Envio"}
            </button>

            {order.melhor_envio_print_url && (
              <a
                href={order.melhor_envio_print_url}
                target="_blank"
                rel="noreferrer"
                className="
                  text-center
                  text-sm
                  font-semibold
                  text-zinc-700
                  underline
                "
              >
                Abrir etiqueta para impressão
              </a>
            )}
          </div>
        </div>
      </div>

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
