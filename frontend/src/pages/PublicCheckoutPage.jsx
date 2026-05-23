import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Lock,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { api }
  from "../services/api";

import { socket }
  from "../websocket/socket";

import {
  OrderPixCard,
} from "../components/orders/OrderPixCard";

import {
  OrderCreditCardCard,
} from "../components/orders/OrderCreditCardCard";
import Formatter from "../utils/Formatter";

export default function PublicCheckoutPage() {

  

  const { id } =
    useParams();

  // =====================
  // STATES
  // =====================

  const [step,
    setStep] =
      useState(1);

  const [loading,
    setLoading] =
      useState(true);

  const [order,
    setOrder] =
      useState(null);

  const [paymentApproved,
    setPaymentApproved] =
      useState(false);

  const [resumeOpen,
    setResumeOpen] =
      useState(false);

  // =====================
  // CUSTOMER
  // =====================

  const [customer,
    setCustomer] =
      useState({

        email: "",
        name: "",
        phone: "",
        cpf: "",

        zipcode: "",
        street: "",
        number: "",
        district: "",
        city: "",
        state: "",
        complement: "",
      });

  // =====================
  // SHIPPING
  // =====================

  const [shippingOptions,
    setShippingOptions] =
      useState([]);

  const [selectedShipping,
    setSelectedShipping] =
      useState(null);

  const [loadingShipping,
    setLoadingShipping] =
      useState(false);

  // =====================
  // PAYMENT
  // =====================

  const [selectedPaymentMethod,
    setSelectedPaymentMethod] =
      useState("pix");

  const [pixData,
    setPixData] =
      useState(null);

  const [loadingPix,
    setLoadingPix] =
      useState(false);

  // =====================
  // LOAD ORDER
  // =====================


  async function loadOrder() {

    try {

      const { data } =
        await api.get(
          `/orders/${id}`
        );

        console.log(data)

      setOrder(data);

    } catch (error) {

      console.log(error);

    } finally {

      setLoading(false);
    }
  }

  useEffect(() => {

    loadOrder();

  }, [id]);

  // =====================
  // SOCKET
  // =====================

  useEffect(() => {

    socket.on(
      "order_updated",
      (updatedOrder) => {

        if (
          updatedOrder.id ===
          Number(id)
        ) {

          setOrder(
            updatedOrder
          );

          if (
            updatedOrder.payment_status ===
            "approved"
          ) {

            setPaymentApproved(
              true
            );
          }
        }
      }
    );

    return () => {

      socket.off(
        "order_updated"
      );
    };

  }, [id]);

  // =====================
  // TOTALS
  // =====================

  const subtotal =
    useMemo(() => {

      if (!order) {
        return 0;
      }

      return (
        order.items?.reduce(
          (acc, item) => {

            return (
              acc +
              (
                Number(
                  item.unit_price
                ) *
                Number(
                  item.quantity
                )
              )
            );

          },
          0
        ) || 0
      );

    }, [order]);

  const total =
    subtotal +
    Number(
      selectedShipping?.price || 0
    );

  // =====================
  // SHIPPING
  // =====================

  async function calculateShipping() {

    try {

      setLoadingShipping(
        true
      );

      const { data } =
        await api.post(
          "/shipping/calculate",
          {
            cep:
              customer.zipcode,

            order_id:
              order.id,
          }
        );

      setShippingOptions(
        data
      );

      if (
        data?.length
      ) {

        setSelectedShipping(
          data[0]
        );
      }

    } catch (error) {

      console.log(error);

    } finally {

      setLoadingShipping(
        false
      );
    }
  }

  // =====================
  // NEXT STEP
  // =====================

  async function nextStep() {

    if (step === 1) {

      if (
        !customer.name ||
        !customer.email ||
        !customer.phone ||
        !customer.cpf
      ) {

        return alert(
          "Preencha todos os dados."
        );
      }

      setStep(2);

      return;
    }

    if (step === 2) {

      if (
        !customer.zipcode ||
        !customer.street ||
        !customer.number ||
        !customer.district ||
        !customer.city ||
        !customer.state
      ) {

        return alert(
          "Preencha o endereço completo."
        );
      }

      await calculateShipping();

      setStep(3);
    }
  }

  // =====================
  // PIX
  // =====================

  async function generatePix() {

    try {

      setLoadingPix(
        true
      );

      const { data } =
        await api.post(
          "/payment/pix",
          {
            order_id:
              order.id,
          }
        );

      setPixData(data);

    } catch (error) {

      alert(
        "Erro ao gerar PIX"
      );

    } finally {

      setLoadingPix(
        false
      );
    }
  }

  // =====================
  // LOADING
  // =====================

  if (
    loading ||
    !order
  ) {

    return (

      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#f6f3f4]
      ">

        <div className="
          text-sm
          text-zinc-500
        ">
          Carregando checkout...
        </div>

      </div>
    );
  }

  return (

    <div className="
      min-h-screen
      bg-[#f6f3f4]
    ">

      {/* HEADER */}

      <div className="
        h-[68px]
        border-b
        border-[#e8dfe2]
        bg-white
      ">

        <div className="
          max-w-[1280px]
          mx-auto
          h-full
          px-4
          lg:px-6
          flex
          items-center
          justify-between
        ">

          <div className="
            flex
            items-center
            gap-3
          ">

            <div className="
              w-9
              h-9
              rounded-xl
              bg-gradient-to-br
              from-[#d85c7a]
              to-[#f3b7c5]
              flex
              items-center
              justify-center
              text-white
            ">

              <Sparkles size={14} />

            </div>

            <div>

              <div className="
                text-[15px]
                font-semibold
                text-zinc-900
              ">
                Helo Cosméticos
              </div>

              <div className="
                text-xs
                text-zinc-500
              ">
                Checkout seguro
              </div>

            </div>

          </div>

          <div className="
            hidden
            lg:flex
            items-center
            gap-2
            text-xs
            text-zinc-500
          ">

            <ShieldCheck
              size={14}
              className="
                text-[#d85c7a]
              "
            />

            Ambiente protegido

          </div>

        </div>

      </div>

      {/* CONTENT */}

      <div className="
        max-w-[1280px]
        mx-auto
        px-4
        lg:px-6
        py-5
      ">

        {/* SUCCESS */}

        {paymentApproved && (

          <div className="
            mb-4
            bg-green-500
            text-white
            rounded-2xl
            p-4
          ">

            <div className="
              flex
              items-center
              gap-3
            ">

              <CheckCircle2
                size={22}
              />

              <div>

                <div className="
                  text-sm
                  font-semibold
                ">
                  Pagamento aprovado
                </div>

                <div className="
                  text-xs
                  text-white/90
                  mt-1
                ">
                  Seu pedido foi confirmado.
                </div>

              </div>

            </div>

          </div>
        )}

        {/* MOBILE SUMMARY */}

        <button
          onClick={() =>
            setResumeOpen(
              !resumeOpen
            )
          }
          className="
            xl:hidden
            w-full
            bg-white
            border
            border-[#e7dfe2]
            rounded-xl
            p-4
            flex
            items-center
            justify-between
            mb-4
          "
        >

          <div className="
            text-left
          ">

            <div className="
              text-xs
              text-zinc-500
            ">
              Resumo do pedido
            </div>

            <div className="
              text-lg
              font-bold
              text-zinc-900
              mt-1
            ">

              R$ {total.toFixed(2)}

            </div>

          </div>

          <ChevronDown size={18} />

        </button>

        {/* GRID */}

        <div className="
          grid
          grid-cols-1
          xl:grid-cols-[1fr_400px]
          rounded-[24px]
          overflow-hidden
          border
          border-[#e7dfe2]
          bg-white
        ">

          {/* LEFT */}

          <div className="
            p-5
            lg:p-6
          ">

            {/* STEPS */}

            <div className="
              flex
              items-center
              justify-center
              mb-7
            ">

              <div className="
                flex
                items-center
                gap-3
              ">

                {[1,2,3].map(
                  (item) => {

                    const active =
                      step >= item;

                    return (

                      <div
                        key={item}
                        className="
                          flex
                          items-center
                          gap-3
                        "
                      >

                        <div className={`
                          w-8
                          h-8
                          rounded-full
                          flex
                          items-center
                          justify-center
                          text-xs
                          font-bold

                          ${
                            active

                              ? `
                                bg-[#d85c7a]
                                text-white
                              `

                              : `
                                bg-[#f2edf0]
                                text-zinc-500
                              `
                          }
                        `}>

                          {
                            step > item

                              ? <Check size={14} />

                              : item
                          }

                        </div>

                        {
                          item !== 3 && (

                            <div className={`
                              w-10
                              h-[2px]

                              ${
                                step > item

                                  ? `
                                    bg-[#d85c7a]
                                  `

                                  : `
                                    bg-[#ebe3e6]
                                  `
                              }
                            `} />
                          )
                        }

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* STEP 1 */}

            {step === 1 && (
              <div>

                <h2 className="
                  text-xl
                  font-semibold
                  text-zinc-900
                ">
                  Informações pessoais
                </h2>

                <p className="
                  mt-1
                  text-sm
                  text-zinc-500
                ">
                  Dados necessários para o envio.
                </p>

                <div className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-1
                ">

                  <input
                    placeholder="Nome completo"
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        name:
                          e.target.value,
                      })
                    }
                    className="
                      h-12
                      rounded-xl
                      border
                      border-[#e7dfe2]
                      px-4
                      text-sm
                      outline-none
                    "
                  />

                  <input
                    placeholder="E-mail"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        email:
                          e.target.value,
                      })
                    }
                    className="
                      h-12
                      rounded-xl
                      border
                      border-[#e7dfe2]
                      px-4
                      text-sm
                      outline-none
                    "
                  />


                  <div className="
                    grid
                    grid-cols-2
                    gap-3
                  ">

                    <input
                      placeholder="Celular"
                      value={Formatter.telefone(customer.phone)}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          phone:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                        outline-none
                      "
                    />

                    <input
                      placeholder="CPF"
                      value={Formatter.cpfCnpj(customer.cpf)}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          cpf:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                        outline-none
                      "
                    />

                  </div>

                </div>

              </div>
            )}

            {/* STEP 2 */}

            {step === 2 && (

              <div>

                <h2 className="
                  text-xl
                  font-semibold
                  text-zinc-900
                ">
                  Endereço
                </h2>

                <p className="
                  mt-1
                  text-sm
                  text-zinc-500
                ">
                  Informe o local da entrega.
                </p>

                <div className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-3
                ">

                  <input
                    placeholder="CEP"
                    value={customer.zipcode}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        zipcode:
                          e.target.value,
                      })
                    }
                    className="
                      h-12
                      rounded-xl
                      border
                      border-[#e7dfe2]
                      px-4
                      text-sm
                    "
                  />

                  <input
                    placeholder="Rua"
                    value={customer.street}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        street:
                          e.target.value,
                      })
                    }
                    className="
                      h-12
                      rounded-xl
                      border
                      border-[#e7dfe2]
                      px-4
                      text-sm
                    "
                  />

                  <div className="
                    grid
                    grid-cols-2
                    gap-3
                  ">

                    <input
                      placeholder="Número"
                      value={customer.number}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          number:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                      "
                    />

                    <input
                      placeholder="Complemento"
                      value={customer.complement}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          complement:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                      "
                    />

                  </div>

                  <input
                    placeholder="Bairro"
                    value={customer.district}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        district:
                          e.target.value,
                      })
                    }
                    className="
                      h-12
                      rounded-xl
                      border
                      border-[#e7dfe2]
                      px-4
                      text-sm
                    "
                  />

                  <div className="
                    grid
                    grid-cols-2
                    gap-3
                  ">

                    <input
                      placeholder="Cidade"
                      value={customer.city}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          city:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                      "
                    />

                    <input
                      placeholder="Estado"
                      value={customer.state}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          state:
                            e.target.value,
                        })
                      }
                      className="
                        h-12
                        rounded-xl
                        border
                        border-[#e7dfe2]
                        px-4
                        text-sm
                      "
                    />

                  </div>

                </div>

              </div>
            )}

            {/* STEP 3 */}

            {step === 3 && (

              <div>

                <h2 className="
                  text-xl
                  font-semibold
                  text-zinc-900
                ">
                  Pagamento
                </h2>

                <p className="
                  mt-1
                  text-sm
                  text-zinc-500
                ">
                  Escolha como deseja pagar.
                </p>

                {/* SHIPPING */}

                {selectedShipping && (

                  <div className="
                    mt-5
                    rounded-xl
                    border
                    border-[#e7dfe2]
                    p-4
                    bg-[#faf7f8]
                  ">

                    <div className="
                      flex
                      items-center
                      justify-between
                    ">

                      <div>

                        <div className="
                          text-sm
                          font-semibold
                          text-zinc-900
                        ">
                          {selectedShipping.name}
                        </div>

                        <div className="
                          mt-1
                          text-xs
                          text-zinc-500
                        ">
                          Entrega em {selectedShipping.delivery_time} dias úteis
                        </div>

                      </div>

                      <div className="
                        text-lg
                        font-bold
                        text-[#d85c7a]
                      ">

                        R$ {
                          Number(
                            selectedShipping.price
                          ).toFixed(2)
                        }

                      </div>

                    </div>

                  </div>
                )}

                {/* UPSELL */}

                <div className="
                  mt-5
                  rounded-xl
                  border
                  border-[#f2dbe2]
                  bg-[#fff8fa]
                  p-4
                ">

                  <div className="
                    text-sm
                    font-semibold
                    text-zinc-900
                  ">
                    Complete sua rotina ✨
                  </div>

                  <div className="
                    mt-1
                    text-xs
                    text-zinc-500
                  ">
                    Aproveite antes de finalizar.
                  </div>

                  <div className="
                    mt-4
                    grid
                    grid-cols-2
                    gap-3
                  ">

                    <button className="
                      border
                      border-[#e7dfe2]
                      bg-white
                      rounded-xl
                      p-3
                      text-left
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                      ">
                        Máscara Capilar
                      </div>

                      <div className="
                        mt-1
                        text-xs
                        text-zinc-500
                      ">
                        Hidratação intensa
                      </div>

                      <div className="
                        mt-2
                        text-base
                        font-bold
                        text-[#d85c7a]
                      ">
                        + R$ 39,90
                      </div>

                    </button>

                    <button className="
                      border
                      border-[#e7dfe2]
                      bg-white
                      rounded-xl
                      p-3
                      text-left
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                      ">
                        Sérum Facial
                      </div>

                      <div className="
                        mt-1
                        text-xs
                        text-zinc-500
                      ">
                        Pele luminosa
                      </div>

                      <div className="
                        mt-2
                        text-base
                        font-bold
                        text-[#d85c7a]
                      ">
                        + R$ 49,90
                      </div>

                    </button>

                  </div>

                </div>

                {/* METHODS */}

                <div className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-3
                ">

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "pix"
                      )
                    }
                    className={`
                      rounded-xl
                      border
                      p-4
                      text-left

                      ${
                        selectedPaymentMethod ===
                        "pix"

                          ? `
                            border-[#d85c7a]
                            bg-[#fff4f7]
                          `

                          : `
                            border-[#e7dfe2]
                          `
                      }
                    `}
                  >

                    <div className="
                      text-sm
                      font-semibold
                      text-zinc-900
                    ">
                      PIX
                    </div>

                    <div className="
                      mt-1
                      text-xs
                      text-zinc-500
                    ">
                      Aprovação imediata
                    </div>

                  </button>

                  <button
                    onClick={() =>
                      setSelectedPaymentMethod(
                        "credit_card"
                      )
                    }
                    className={`
                      rounded-xl
                      border
                      p-4
                      text-left

                      ${
                        selectedPaymentMethod ===
                        "credit_card"

                          ? `
                            border-[#d85c7a]
                            bg-[#fff4f7]
                          `

                          : `
                            border-[#e7dfe2]
                          `
                      }
                    `}
                  >

                    <div className="
                      text-sm
                      font-semibold
                      text-zinc-900
                    ">
                      Cartão
                    </div>

                    <div className="
                      mt-1
                      text-xs
                      text-zinc-500
                    ">
                      Em até 12x
                    </div>

                  </button>

                </div>

                {/* PAYMENT */}

                <div className="
                  mt-5
                ">

                  {
                    selectedPaymentMethod ===
                    "pix" && (

                      <OrderPixCard
                        generatePix={
                          generatePix
                        }

                        loadingPix={
                          loadingPix
                        }

                        pixData={
                          pixData
                        }

                        order={
                          order
                        }
                      />
                    )
                  }

                  {
                    selectedPaymentMethod ===
                    "credit_card" && (

                      <OrderCreditCardCard
                        order={order}
                      />
                    )
                  }

                </div>

              </div>
            )}

            {/* ACTION */}

            {step < 3 && (

              <button
                onClick={nextStep}
                className="
                  mt-6
                  w-full
                  h-12
                  rounded-xl
                  bg-[#d85c7a]
                  text-white
                  text-sm
                  font-semibold
                  hover:opacity-90
                "
              >

                Continuar

              </button>
            )}

          </div>

          {/* RIGHT */}

          <div className={`
            bg-[#faf7f8]
            border-l
            border-[#e7dfe2]
            p-5

            ${
              resumeOpen

                ? "block"

                : "hidden xl:block"
            }
          `}>

            <div className="
              space-y-4
            ">

              {order.items?.map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={index}
                    className="
                      flex
                      gap-3
                    "
                  >

                    <div className="
                      relative
                      w-20
                      h-20
                      rounded-2xl
                      overflow-hidden
                      bg-white
                      border
                      border-[#e7dfe2]
                      shrink-0
                    ">
                      <img
                        src={`${import.meta.env.VITE_API_URL}${item.product?.images?.[0]?.image_url}`}
                        alt={item.product?.title}
                        className="
                          w-full
                          h-full
                          object-cover
                        "
                      />


                    </div>

                    

                    <div className="
                      flex-1
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                        leading-snug
                      ">

                        {
                          item.product
                            ?.title
                        }

                      </div>

                      <div className="
                        mt-1
                        text-xs
                        text-zinc-500
                      ">

                        Unidade: R$ {
                          Number(
                            item.unit_price
                          ).toFixed(2)
                        }

                      </div>

                      <div className="
                        mt-2
                        text-lg
                        font-bold
                        text-zinc-900
                      ">

                        R$ {
                          (
                            Number(
                              item.unit_price
                            ) *
                            Number(
                              item.quantity
                            )
                          ).toFixed(2)
                        }

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

            {/* TOTAL */}

            <div className="
              mt-6
              pt-6
              border-t
              border-[#e7dfe2]
            ">

              <div className="
                space-y-2
              ">

                <div className="
                  flex
                  justify-between
                  text-sm
                  text-zinc-600
                ">

                  <span>
                    Subtotal
                  </span>

                  <span>
                    R$ {subtotal.toFixed(2)}
                  </span>

                </div>

                <div className="
                  flex
                  justify-between
                  text-sm
                  text-zinc-600
                ">

                  <span>
                    Frete 
                  </span>

                  <span>

                    R$ {
                      Number(
                        selectedShipping?.price || 0
                      ).toFixed(2)
                    }

                  </span>

                </div>

              </div>

              <div className="
                mt-5
                pt-5
                border-t
                border-[#e7dfe2]
                flex
                items-end
                justify-between
              ">

                <div>

                  <div className="
                    text-xs
                    text-zinc-500
                  ">
                    Total
                  </div>

                  <div className="
                    mt-1
                    text-3xl
                    font-bold
                    text-zinc-900
                  ">

                    R$ {total.toFixed(2)}

                  </div>

                </div>

                <div className="
                  text-right
                ">

                  <div className="
                    text-xs
                    text-zinc-500
                  ">
                    Em até
                  </div>

                  <div className="
                    text-sm
                    font-semibold
                    text-zinc-900
                  ">
                    3x sem juros
                  </div>

                </div>

              </div>

            </div>

            {/* SECURITY */}

            <div className="
              mt-6
              rounded-2xl
              border
              border-[#e7dfe2]
              bg-white
              p-4
            ">

              <div className="
                flex
                items-start
                gap-3
              ">
                <div>
                  <div className="
                    text-lg
                    font-semibold
                    text-green-700
                    text-center
                  ">
                    Compra segura
                  </div>

                {/* TRUST BADGES */}

                <div className="
                  mt-2
                  space-y-3
                ">

                  {/* ITEM */}

                  <div className="
                    bg-white
                    border
                    border-[#e7dfe2]
                    rounded-xl
                    px-4
                    py-3
                    flex
                    items-center
                    gap-3
                  ">
                  <div className="
                    w-10
                    h-10
                    rounded-xl
                    bg-green-100
                    flex
                    items-center
                    justify-center
                    text-green-600
                  ">
                    <ShieldCheck size={16} />
                  </div>

                    <div className="
                      flex-1
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                      ">
                        Ambiente 100% seguro
                      </div>

                      <div className="
                        text-xs
                        text-zinc-500
                        mt-0.5
                      ">
                        Dados protegidos com criptografia SSL
                      </div>

                    </div>

                  </div>

                  {/* ITEM */}

                  <div className="
                    bg-white
                    border
                    border-[#e7dfe2]
                    rounded-xl
                    px-4
                    py-3
                    flex
                    items-center
                    gap-3
                  ">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-emerald-100
                  flex
                  items-center
                  justify-center
                  text-emerald-600
                ">
                  <Lock size={16} />
                </div>

                    <div className="
                      flex-1
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                      ">
                        Pagamento protegido
                      </div>

                      <div className="
                        text-xs
                        text-zinc-500
                        mt-0.5
                      ">
                        Processado via Mercado Pago
                      </div>

                    </div>

                  </div>

                  {/* ITEM */}

                  <div className="
                    bg-white
                    border
                    border-[#e7dfe2]
                    rounded-xl
                    px-4
                    py-3
                    flex
                    items-center
                    gap-3
                  ">

                <div className="
                  w-10
                  h-10
                  rounded-xl
                  bg-yellow-100
                  flex
                  items-center
                  justify-center
                  text-yellow-600
                ">
                  <Truck size={16} />
                </div>

                    <div className="
                      flex-1
                    ">

                      <div className="
                        text-sm
                        font-semibold
                        text-zinc-900
                      ">
                        Entrega rápida
                      </div>

                      <div className="
                        text-xs
                        text-zinc-500
                        mt-0.5
                      ">
                        Frete calculado via Melhor Envio
                      </div>

                    </div>

                  </div>

                </div>

                  

                  <div className="
                    mt-1
                    text-sm
                    text-green-900
                  ">

                    Pagamento processado com segurança pelo Mercado Pago.

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}