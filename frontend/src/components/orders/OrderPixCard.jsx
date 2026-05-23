export function OrderPixCard({
  generatePix,
  loadingPix,
  pixData,
  order,
}) {

  return (
<div className="
  bg-white

  border
  border-zinc-200

  rounded-2xl

  p-4
">

      {/* HEADER */}
      <div className="
        mb-4
      ">

        <h3 className="
          text-lg
          font-bold
        ">
          Pagamento PIX
        </h3>

        <p className="
          text-sm
          text-zinc-500
          mt-1
        ">
          Gere um QRCode PIX
          para pagamento
        </p>
      </div>

      {/* STATUS */}
      <div className={`
        mb-5

        rounded-2xl

        p-4

        border

        ${
          order.payment_status ===
          "paid"

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
                order.payment_status ===
                "paid"

                  ? `
                    text-green-700
                  `

                  : `
                    text-yellow-700
                  `
              }
            `}>

              {
                order.payment_status ===
                "paid"

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
              order.payment_status ===
              "paid"

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

          bg-green-600
          hover:bg-green-700

          text-white

          py-4

          rounded-2xl

          font-bold

          transition-all
        "
      >
        {
          loadingPix

            ? "Gerando PIX..."

            : "Gerar PIX"
        }
      </button>

      {/* PIX */}
      {pixData && (

        <div className="
          mt-5

          border
          border-zinc-200

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
              font-bold
            ">
              PIX Gerado
            </div>

            <div className="
              text-sm
              text-zinc-500
              mt-1
            ">
              Escaneie o QRCode
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
              border-zinc-200

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

              bg-black
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