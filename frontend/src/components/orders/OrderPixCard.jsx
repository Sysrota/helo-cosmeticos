export function OrderPixCard({
  generatePix,
  loadingPix,
  pixData,
  order,
  pixDiscount,
  pixTotal,
}) {
  const isPaid =
    order.payment_status === "paid" ||
    order.payment_status === "approved";

  return (
<div className="
  bg-white

  border
  border-[#eee2e6]

  rounded-[22px]

  p-5
">

      {/* HEADER */}
      <div className="
        mb-4
      ">

        <h3 className="
          text-lg
          font-semibold
          text-[#43232d]
        ">
          Pagamento PIX
        </h3>

        <p className="
          text-sm
          text-zinc-500
          mt-1
        ">
          Pague em segundos com confirmação rápida.
        </p>

        <div className="
          mt-4
          flex
          items-center
          justify-between
          rounded-2xl
          bg-emerald-50
          px-4
          py-3
          text-sm
        ">
          <span className="text-emerald-700">
            10% de desconto no PIX
          </span>
          <span className="font-semibold text-emerald-800">
            {Number(pixTotal || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <p className="mt-2 text-xs text-emerald-700">
          Você economiza {Number(pixDiscount || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}.
        </p>
      </div>

      {/* STATUS */}
      <div className={`
        mb-5

        rounded-2xl

        p-4

        border

        ${
          isPaid

            ? `
              bg-green-50
              border-green-200
            `

            : `
              bg-yellow-50
              border-yellow-200
            `
        }
      `}>

        <div className="
          flex
          items-center
          justify-between
        ">

          <div>

            <div className="
              text-sm
              text-zinc-500
            ">
              Status Pagamento
            </div>

            <div className={`
              font-bold
              mt-1

              ${
                isPaid

                  ? `
                    text-green-700
                  `

                  : `
                    text-yellow-700
                  `
              }
            `}>

              {
                isPaid

                  ? "Pagamento aprovado"

                  : "Aguardando pagamento"
              }
            </div>
          </div>

          <div className={`
            w-4
            h-4

            rounded-full

            ${
              isPaid

                ? `
                  bg-green-500
                `

                : `
                  bg-yellow-500
                `
            }
          `} />
        </div>
      </div>

      {/* BUTTON */}
      <button
        onClick={generatePix}

        disabled={loadingPix}

        className="
          w-full

          bg-[#d85c7a]
          hover:bg-[#c9506d]

          text-white

          h-14

          rounded-2xl

          font-bold

          transition-all
        "
      >
        {
          loadingPix

            ? "Gerando PIX..."

            : "Gerar QR Code PIX"
        }
      </button>

      {/* PIX */}
      {pixData && (

        <div className="
          mt-5

          border
          border-[#eee2e6]

          rounded-2xl

          p-4

          flex
          flex-col
          items-center

          gap-4
        ">

          <div className="
            text-center
          ">

            <div className="
              text-xl
              font-semibold
              text-[#43232d]
            ">
              PIX Gerado
            </div>

            <div className="
              text-sm
              text-zinc-500
              mt-1
            ">
              Escaneie o QR Code
              para pagar
            </div>
          </div>

          {/* QR */}
          <img
            src={`
              data:image/png;base64,
              ${pixData.qr_code_base64}
            `}

            alt="PIX"

            className="
              w-64
              h-64
              object-contain
            "
          />

          {/* CODE */}
          <textarea
            readOnly

            value={
              pixData.qr_code
            }

            className="
              w-full
              h-28

              border
              border-[#eee2e6]

              rounded-2xl

              p-4

              text-sm
            "
          />

          {/* COPY */}
          <button
            onClick={() => {

              navigator.clipboard.writeText(
                pixData.qr_code
              );
            }}

            className="
              w-full

              bg-[#43232d]
              hover:bg-[#532d38]
              text-white

              py-4

              rounded-2xl

              font-semibold
            "
          >
            Copiar PIX
          </button>
        </div>
      )}
    </div>
  );
}
