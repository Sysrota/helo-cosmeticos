import {
  useEffect,
  useRef,
} from "react";


const API_URL =
  import.meta.env
    .VITE_API_URL;

export function OrderCreditCardCard(  order) {
  const mpRef =
    useRef(null);

    console.log(
      "ORDER",
      order
    );

  // =========================
  // INIT MP
  // =========================

    useEffect(() => {
      if (!window.mp) {
      return;
      }
      mpRef.current =
      window.mp.cardForm({

        amount: "1",

        iframe: true,

        form: {

          id: "form-checkout",

          cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder:
              "Número do cartão",
          },

          expirationDate: {
            id:
              "form-checkout__expirationDate",

            placeholder:
              "MM/AA",
          },

          securityCode: {
            id:
              "form-checkout__securityCode",

            placeholder:
              "CVV",
          },

          cardholderName: {
            id:
              "form-checkout__cardholderName",

            placeholder:
              "Nome no cartão",
          },

          cardholderEmail: {
            id:
              "form-checkout__email",

            placeholder:
              "E-mail",
          },

          identificationType: {
            id:
              "form-checkout__identificationType",
          },

          identificationNumber: {
            id:
              "form-checkout__identificationNumber",

            placeholder:
              "CPF",
          },

          issuer: {
            id:
              "form-checkout__issuer",
          },

          installments: {
            id:
              "form-checkout__installments",
          },
        },

        callbacks: {

          onFormMounted:
            (error) => {

              if (error) {

                console.log(
                  "MOUNT ERROR",
                  error
                );

                return;
              }

              console.log(
                "MP READY"
              );
            },

          onCardTokenReceived:
            (error, token) => {

              if (error) {

                console.log(
                  "TOKEN ERROR",
                  error
                );

                return;
              }

              console.log(
                "TOKEN",
                token
              );
            },
        },
      });

    }, []);

  // =========================
  // PAYMENT
  // =========================

  async function handlePayment() {

    try {

      const tokenizedCard =
        await mpRef.current
          .createCardToken();

      const data =
        mpRef.current
          .getCardFormData();

      console.log(
        "TOKEN",
        tokenizedCard
      );

      console.log(
        "CARD DATA",
        data
      );


      const fullName =
        order.order.contact?.name || "";

      const names =
        fullName.split(" ");


        console.log({
          fullName,

          order_id:
            order.id,

          token:
            tokenizedCard.token,

          transaction_amount:
            parseFloat(
              String(order.total || 0)
            ),
        });

      const response =
        await fetch(

          `${API_URL}/payment/card`,

          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              order_id:
                order.id,

              token:
                tokenizedCard.id,

              payment_method_id:
                data.paymentMethodId,

              transaction_amount:
                Number(order.total),

              installments:
                Number(
                  data.installments
                ),

              payer: {

                email:
                  data.cardholderEmail,

                first_name:
                  names[0],

                last_name:
                  names
                    .slice(1)
                    .join(" "),

                identification: {

                  type:
                    data.identificationType,

                  number:
                    data.identificationNumber,
                },
              },
            }),
          }
        );

      const payment =
        await response.json();

      console.log(
        "PAYMENT",
        payment
      );

    } catch (error) {

      console.log(
        "PAY ERROR",
        error
      );
    }
  }
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
        mb-5
      ">

        <h2 className="
          text-lg
          font-bold
          text-zinc-900
        ">
          Cartão de Crédito
        </h2>

        <p className="
          text-sm
          text-zinc-500
          mt-1
        ">
          Pagamento seguro via
          Mercado Pago
        </p>
      </div>

      {/* FORM */}
      <form
        id="form-checkout"

        className="
          flex
          flex-col
          gap-4
        "
      >

        {/* CARD NUMBER */}
        <div>

          <label className="
            text-sm
            text-zinc-500
            block
            mb-2
          ">
            Número do cartão
          </label>

          <div className="
            h-[56px]

            border
            border-zinc-200

            rounded-2xl

            px-4

            flex
            items-center

            bg-white

            focus-within:border-black

            transition-all
          ">

            <div
              id="form-checkout__cardNumber"

              className="
                w-full
              "
            />
          </div>
        </div>

        {/* ROW */}
        <div className="
          grid
          grid-cols-2
          gap-4
        ">

          {/* EXP */}
          <div>

            <label className="
              text-sm
              text-zinc-500
              block
              mb-2
            ">
              Validade
            </label>

            <div className="
              h-[56px]

              border
              border-zinc-200

              rounded-2xl

              px-4

              flex
              items-center

              bg-white

              focus-within:border-black

              transition-all
            ">

              <div
                id="form-checkout__expirationDate"

                className="
                  w-full
                "
              />
            </div>
          </div>

          {/* CVV */}
          <div>

            <label className="
              text-sm
              text-zinc-500
              block
              mb-2
            ">
              CVV
            </label>

            <div className="
              h-[56px]

              border
              border-zinc-200

              rounded-2xl

              px-4

              flex
              items-center

              bg-white

              focus-within:border-black

              transition-all
            ">

              <div
                id="form-checkout__securityCode"

                className="
                  w-full
                "
              />
            </div>
          </div>
        </div>

        {/* NAME */}
        <div>

          <label className="
            text-sm
            text-zinc-500
            block
            mb-2
          ">
            Nome impresso
          </label>

          <input
            id="form-checkout__cardholderName"

            name="cardholderName"

            placeholder="
              Nome no cartão
            "

            className="
              w-full
              h-[56px]

              border
              border-zinc-200

              rounded-2xl

              px-4

              bg-white

              outline-none

              focus:border-black

              transition-all
            "
          />
        </div>

        {/* EMAIL */}
        <div>

          <label className="
            text-sm
            text-zinc-500
            block
            mb-2
          ">
            E-mail
          </label>

          <input
            id="form-checkout__email"

            placeholder="
              cliente@email.com
            "

            className="
              w-full
              h-[56px]

              border
              border-zinc-200

              rounded-2xl

              px-4

              bg-white

              outline-none

              focus:border-black

              transition-all
            "
          />
        </div>

        {/* CPF */}
        <div>

          <label className="
            text-sm
            text-zinc-500
            block
            mb-2
          ">
            CPF
          </label>

          <div className="
            grid
            grid-cols-[120px_1fr]
            gap-3
          ">

            <select
              id="form-checkout__identificationType"

              className="
                h-[56px]

                border
                border-zinc-200

                rounded-2xl

                px-4

                bg-white

                outline-none
              "
            />

            <input
              id="form-checkout__identificationNumber"

              placeholder="
                000.000.000-00
              "

              className="
                w-full
                h-[56px]

                border
                border-zinc-200

                rounded-2xl

                px-4

                bg-white

                outline-none

                focus:border-black

                transition-all
              "
            />
          </div>
        </div>

        {/* INSTALLMENTS */}
        <div>

          <label className="
            text-sm
            text-zinc-500
            block
            mb-2
          ">
            Parcelamento
          </label>

          <select
            id="form-checkout__installments"

            className="
              w-full
              h-[56px]

              border
              border-zinc-200

              rounded-2xl

              px-4

              bg-white

              outline-none

              focus:border-black

              transition-all
            "
          />
        </div>

        {/* ISSUER */}
        <div className="
          hidden
        ">

          <select
            id="form-checkout__issuer"
          />
        </div>

        {/* BUTTON */}
        <button
          type="button"

          onClick={
            handlePayment
          }

          className="
            w-full
            h-[56px]

            bg-sky-600
            hover:bg-sky-700

            text-white

            rounded-2xl

            font-semibold

            transition-all
          "
        >
          Pagar com Cartão
        </button>
      </form>
    </div>
  );
}