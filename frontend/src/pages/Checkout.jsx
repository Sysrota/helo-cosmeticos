import {
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import { api }
  from "../services/api";

import {
  useCart,
} from "../context/CartContext";
import ProductImagePreview from "../components/ProductImagePreview";

export default function Checkout() {

  const navigate =
    useNavigate();

  const {
    cart,
    subtotal,
    totalItems,
  } = useCart();

  // =====================
  // STATES
  // =====================

  const [loading, setLoading] =
    useState(false);

  const [cep, setCep] =
    useState("");

  const [shippingOptions,
    setShippingOptions] =
      useState([]);

  const [selectedShipping,
    setSelectedShipping] =
      useState(null);

  const [form,
    setForm] =
      useState({

        name: "",

        phone: "",

        email: "",

        cpf: "",

        street: "",

        number: "",

        district: "",

        city: "",

        state: "",
      });

  // =====================
  // EMPTY CART
  // =====================

  if (
    !cart.length
  ) {

    navigate("/carrinho");

    return null;
  }

  // =====================
  // SHIPPING TOTAL
  // =====================

  const shippingPrice =
    Number(
      selectedShipping?.price || 0
    );

  // =====================
  // FINAL TOTAL
  // =====================

  const total =
    useMemo(() => {

      return (
        subtotal +
        shippingPrice
      );

    }, [
      subtotal,
      shippingPrice,
    ]);

  // =====================
  // SHIPPING
  // =====================

  async function calculateShipping() {

    try {

      setLoading(true);

      const response =
        await api.post(
          "/shipping/calculate",
          {
            cep,
            cart,
          }
        );

      setShippingOptions(
        response.data
      );

    } catch (error) {

      console.log(error);

      alert(
        "Erro ao calcular frete"
      );

    } finally {

      setLoading(false);
    }
  }

  // =====================
  // CHECKOUT
  // =====================

  async function finishCheckout() {

    try {

      setLoading(true);

      const response =
        await api.post(
          "/checkout",
          {

            customer:
              form,

            cart,

            shipping:
              selectedShipping,
          }
        );

      navigate(
        `/pedido/${response.data.id}`
      );

    } catch (error) {

      console.log(error);

      alert(
        "Erro ao finalizar pedido"
      );

    } finally {

      setLoading(false);
    }
  }

  // =====================
  // PAGE
  // =====================

  return (

    <div className="bg-helo-background min-h-screen py-12">

      <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}

        <div className="mb-12">

          <h1 className="text-5xl font-display text-helo-dark">
            Finalizar compra
          </h1>

          <p className="text-helo-text mt-3 text-lg">
            Preencha seus dados para concluir o pedido ✨
          </p>

        </div>

        {/* GRID */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT */}

          <div className="lg:col-span-2 space-y-8">

            {/* PERSONAL */}

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">

              <h2 className="text-2xl font-display text-helo-dark mb-6">
                Seus dados
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <input
                  placeholder="Nome completo"
                  className="h-14 px-5 rounded-2xl border border-black/10 outline-none"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="Telefone"
                  className="h-14 px-5 rounded-2xl border border-black/10 outline-none"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="E-mail"
                  className="h-14 px-5 rounded-2xl border border-black/10 outline-none md:col-span-2"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="CPF"
                  className="h-14 px-5 rounded-2xl border border-black/10 outline-none"
                  value={form.cpf}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cpf: e.target.value,
                    })
                  }
                />

              </div>

            </div>

            {/* SHIPPING */}

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">

              <h2 className="text-2xl font-display text-helo-dark mb-6">
                Entrega
              </h2>

              {/* CEP */}

              <div className="flex gap-4">

                <input
                  placeholder="Digite seu CEP"
                  className="flex-1 h-14 px-5 rounded-2xl border border-black/10 outline-none"
                  value={cep}
                  onChange={(e) =>
                    setCep(e.target.value)
                  }
                />

                <button
                  onClick={calculateShipping}
                  disabled={loading}
                  className="px-8 rounded-2xl bg-helo-dark text-white font-semibold hover:bg-helo-rose transition-all"
                >
                  Calcular
                </button>

              </div>

              {/* OPTIONS */}

              {shippingOptions.length > 0 && (

                <div className="mt-6 space-y-4">

                  {shippingOptions.map(
                    (option, index) => (

                      <button
                        key={index}
                        onClick={() =>
                          setSelectedShipping(option)
                        }
                        className={`
                          w-full p-5 rounded-2xl border text-left transition-all

                          ${
                            selectedShipping?.id === option.id

                              ? "border-helo-dark bg-helo-background"

                              : "border-black/10 bg-white"
                          }
                        `}
                      >

                        <div className="flex items-center justify-between">

                          <div>

                            <div className="font-semibold text-lg">
                              {option.name}
                            </div>

                            <div className="text-sm text-helo-text mt-1">
                              {option.company?.name}
                            </div>

                          </div>

                          <div className="text-right">

                            <div className="font-bold text-xl">
                              R$ {Number(option.price).toFixed(2)}
                            </div>

                            <div className="text-sm text-helo-text">
                              {option.delivery_time} dias úteis
                            </div>

                          </div>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

          {/* SIDEBAR */}

          <div>

            <div className="sticky top-24 bg-white rounded-3xl shadow-sm border border-black/5 p-8">

              <h2 className="text-3xl font-display text-helo-dark mb-8">
                Resumo
              </h2>

              {/* ITEMS */}

              <div className="space-y-4">

                {cart.map((item, index) => (

                  <div
                    key={index}
                    className="flex gap-4"
                  >

                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-helo-background">

                      <ProductImagePreview
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full"
                        imageClassName="h-full w-full object-cover"
                      />

                    </div>

                    <div className="flex-1">

                      <div className="font-semibold text-sm">
                        {item.title}
                      </div>

                      {item.subtitle && (
                        <div className="mt-1 line-clamp-2 text-xs leading-4 text-helo-text">
                          {item.subtitle}
                        </div>
                      )}

                      <div className="text-sm text-helo-text mt-1">
                        {item.quantity}x
                      </div>

                    </div>

                    <div className="font-semibold">

                      R$ {
                        (
                          Number(item.price) *
                          Number(item.quantity)
                        ).toFixed(2)
                      }

                    </div>

                  </div>
                ))}

              </div>

              {/* DIVIDER */}

              <div className="my-8 border-t border-black/10" />

              {/* TOTALS */}

              <div className="space-y-4">

                <div className="flex justify-between">

                  <span className="text-helo-text">
                    Produtos
                  </span>

                  <span>
                    R$ {subtotal.toFixed(2)}
                  </span>

                </div>

                <div className="flex justify-between">

                  <span className="text-helo-text">
                    Frete
                  </span>

                  <span>

                    {selectedShipping

                      ? `R$ ${shippingPrice.toFixed(2)}`

                      : "Calcular"}

                  </span>

                </div>

              </div>

              {/* FINAL */}

              <div className="my-8 border-t border-black/10" />

              <div className="flex justify-between items-center">

                <span className="text-2xl font-semibold">
                  Total
                </span>

                <span className="text-4xl font-bold text-helo-dark">

                  R$ {total.toFixed(2)}

                </span>

              </div>

              {/* SECURITY */}

              <div className="bg-helo-background rounded-2xl p-4 mt-8 mb-8">

                <div className="space-y-2 text-sm text-helo-text">

                  <div>
                    🔒 Pagamento seguro Mercado Pago
                  </div>

                  <div>
                    🚚 Entrega via Melhor Envio
                  </div>

                  <div>
                    💳 PIX e cartão de crédito
                  </div>

                </div>

              </div>

              {/* BUTTON */}

              <button
                disabled={
                  loading ||
                  !selectedShipping
                }
                onClick={finishCheckout}
                className="w-full py-5 rounded-2xl bg-helo-dark text-white text-lg font-semibold hover:bg-helo-rose transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >

                {loading
                  ? "Processando..."
                  : "Finalizar pedido"}

              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
