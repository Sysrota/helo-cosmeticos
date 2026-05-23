import {
  useEffect,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api }
  from "../services/api";

import {
  useCart,
} from "../context/CartContext";

export default function AiCartPage() {

  const navigate =
    useNavigate();

  const { token } =
    useParams();

    console.log(
      "TOKEN:",
      token
    );

  const {
    clearCart,
    addToCart,
  } = useCart();

  useEffect(() => {

    async function loadCart() {

      try {

        // =====================
        // API
        // =====================

        const response =
          await api.get(
            `/ai/cart/${token}`
          );

        console.log(
          "AI CART RESPONSE:",
          response
        );

        const cart =
          response.data.cart;

        // =====================
        // VALIDATE
        // =====================

        if (
          !cart ||
          !cart.items ||
          !cart.items.length
        ) {

          console.log(
            "CARRINHO VAZIO"
          );

          return navigate("/");
        }

        // =====================
        // CLEAR CURRENT CART
        // =====================

        clearCart();

        // =====================
        // HYDRATE CART
        // =====================

        cart.items.forEach(
          (item) => {

            addToCart({

              id:
                item.id,

              product_id:
                item.product_id,

              title:
                item.title,

              image:
                item.image,

              price:
                Number(item.price),

              quantity:
                Number(item.quantity || 1),
            });
          }
        );

        // =====================
        // WAIT STATE UPDATE
        // =====================

        setTimeout(() => {

          navigate(
            "/carrinho"
          );

        }, 300);

      } catch (error) {

        console.log(
          "AI CART ERROR:",
          error
        );

        navigate("/");
      }
    }

    loadCart();

  }, []);

  return (

    <div className="min-h-screen flex items-center justify-center bg-helo-background">

      <div className="text-center">

        <h1 className="text-3xl font-display text-helo-dark mb-4">
          Preparando seu carrinho...
        </h1>

        <p className="text-helo-text">
          Aguarde um instante ✨
        </p>

      </div>

    </div>
  );
}