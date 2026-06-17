import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useCart,
} from "../context/CartContext";
import UpsellProducts from "../components/UpsellProducts";
import ProductImagePreview from "../components/ProductImagePreview";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

export default function Carrinho() {
  const { cardLabel, freeShippingLabel } =
    useCommercialPolicy();

  const navigate =
    useNavigate();

  const {
    cart,
    removeFromCart,
    clearCart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  // =====================
  // TOTAL
  // =====================

  const total =
    cart.reduce(

      (acc, item) => {

        return (
          acc +
          (
            Number(item.price) *
            Number(item.quantity || 1)
          )
        );
      },

      0
    );

  // =====================
  // EMPTY
  // =====================

  if (
    !cart ||
    cart.length === 0
  ) {

    return (

      <div className="bg-helo-background min-h-screen py-20">

        <div className="max-w-4xl mx-auto px-6 text-center">

          <h1 className="text-5xl font-display text-helo-dark mb-6">
            Seu carrinho está vazio
          </h1>

          <p className="text-helo-text text-lg mb-10">
            Adicione produtos incríveis da Helo Cosméticos ✨
          </p>

          <Link
            to="/produtos"
            className="inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-helo-dark text-white text-lg font-semibold hover:bg-helo-rose transition-all shadow-lg hover:shadow-xl"
          >
            Ver produtos
          </Link>

        </div>

      </div>
    );
  }

  // =====================
  // PAGE
  // =====================

  return (

    <div className="bg-helo-background min-h-screen py-12">

      <div className="max-w-7xl mx-auto px-6">

        {/* ===================== */}
        {/* HEADER */}
        {/* ===================== */}

        <div className="mb-12">

          <h1 className="text-5xl font-display text-helo-dark">
            Seu carrinho
          </h1>

          <p className="text-helo-text mt-3 text-lg">
            Revise seus produtos antes de finalizar sua compra.
          </p>

        </div>

        {/* ===================== */}
        {/* GRID */}
        {/* ===================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ===================== */}
          {/* PRODUCTS */}
          {/* ===================== */}

          <div className="lg:col-span-2 space-y-6">

            {cart.map((item, index) => (

              <div
                key={index}
                className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col md:flex-row gap-6"
              >

                {/* IMAGE */}

                <div className="w-full md:w-40 h-40 rounded-2xl overflow-hidden bg-helo-background flex items-center justify-center">

                  <ProductImagePreview
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full"
                    imageClassName="h-full w-full object-cover"
                  />

                </div>

                {/* INFO */}

                <div className="flex-1 flex flex-col justify-between">

                  <div>

                    <h2 className="text-2xl font-display text-helo-dark">
                      {item.title}
                    </h2>

                    <p className="text-helo-text mt-2">
                      {item.subtitle ||
                        "Produto selecionado pela sua consultora Helo ✨"}
                    </p>

                  </div>

                  {/* PRICE + QUANTITY */}

                  <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    {/* QUANTITY */}

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() =>
                          decreaseQuantity(index)
                        }
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all text-xl"
                      >
                        -
                      </button>

                      <div className="w-12 text-center font-semibold text-lg">
                        {item.quantity || 1}
                      </div>

                      <button
                        onClick={() =>
                          increaseQuantity(index)
                        }
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all text-xl"
                      >
                        +
                      </button>

                    </div>

                    {/* PRICE */}

                    <div className="text-right">

                      <div className="text-sm text-helo-text">
                        Subtotal
                      </div>

                      <div className="text-2xl font-bold text-helo-dark">

                        R$ {
                          (
                            Number(item.price) *
                            Number(item.quantity || 1)
                          ).toFixed(2)
                        }

                      </div>

                    </div>

                  </div>

                  {/* REMOVE */}

                  <div className="mt-5">

                    <button
                      onClick={() =>
                        removeFromCart(index)
                      }
                      className="text-red-500 hover:text-red-600 font-semibold transition-all"
                    >
                      Remover produto
                    </button>

                  </div>

                </div>

              </div>
            ))}

          </div>

          {/* ===================== */}
          {/* SIDEBAR */}
          {/* ===================== */}

          <div>

            <div className="sticky top-24 bg-white rounded-3xl shadow-sm border border-black/5 p-8">

              {/* TITLE */}

              <h2 className="text-3xl font-display text-helo-dark mb-8">
                Resumo
              </h2>

              {/* INFO */}

              <div className="space-y-4">

                <div className="flex items-center justify-between">

                  <span className="text-helo-text">
                    Produtos
                  </span>

                  <span className="font-semibold">
                    {cart.length}
                  </span>

                </div>

                <div className="flex items-center justify-between">

                  <span className="text-helo-text">
                    Frete
                  </span>

                  <span className="text-helo-dark">
                    Calculado no checkout
                  </span>

                </div>

              </div>

              {/* DIVIDER */}

              <div className="my-8 border-t border-black/10" />

              {/* TOTAL */}

              <div className="flex items-center justify-between mb-8">

                <span className="text-xl font-semibold text-helo-dark">
                  Total
                </span>

                <span className="text-4xl font-bold text-helo-dark">

                  R$ {total.toFixed(2)}

                </span>

              </div>

              {/* SECURITY */}

              <div className="bg-helo-background rounded-2xl p-4 mb-8">

                <div className="space-y-2 text-sm text-helo-text">

                  <div>
                    🔒 Pagamento 100% seguro
                  </div>

                  <div>
                    🚚 {freeShippingLabel}
                  </div>

                  <div>
                    💳 {cardLabel}
                  </div>

                </div>

              </div>

              {/* BUTTONS */}

              <div className="space-y-4">

                <button
                  onClick={() =>
                    navigate("/checkout")
                  }
                  className="w-full py-5 rounded-2xl bg-helo-dark text-white text-lg font-semibold hover:bg-helo-rose transition-all shadow-lg hover:shadow-xl"
                >
                  Finalizar compra
                </button>

                <button
                  onClick={clearCart}
                  className="w-full py-4 rounded-2xl bg-gray-100 text-helo-text hover:bg-gray-200 transition-all"
                >
                  Limpar carrinho
                </button>

              </div>

            </div>

          </div>

        </div>

        <UpsellProducts
          excludedIds={
            cart.map(
              (item) =>
                item.product_id ??
                item.id
            )
          }
          onAdd={addToCart}
          title="Leve também"
          description="Produtos que combinam com sua escolha e podem ser adicionados em um clique."
        />

      </div>

    </div>
  );
}
