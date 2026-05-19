import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";

export default function Carrinho() {
  const { cart, removeFromCart, clearCart } = useCart();

  const total = cart.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="bg-helo-background min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-6">

        <h1 className="text-4xl font-display text-helo-dark mb-10">Carrinho</h1>

        {cart.length === 0 ? (
          <p className="text-helo-text text-lg">
            Seu carrinho está vazio.  
            <Link to="/produtos" className="text-helo-dark font-semibold"> Ver produtos</Link>
          </p>
        ) : (
          <>
            <div className="space-y-6">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />

                  <div className="flex-grow">
                    <h2 className="font-display text-xl">{item.title}</h2>
                    <p className="text-helo-text">R$ {item.price.toFixed(2)}</p>
                  </div>

                  <button
                    className="text-red-500 font-semibold"
                    onClick={() => removeFromCart(index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-10 text-right">
              <p className="text-2xl font-display mb-4">
                Total: R$ {total.toFixed(2)}
              </p>

              <button className="px-8 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold hover:bg-helo-rose transition-all shadow-md hover:shadow-lg">
                Finalizar compra
              </button>

              <button
                className="px-8 py-4 ml-4 bg-gray-200 text-helo-text rounded-xl hover:bg-gray-300"
                onClick={clearCart}
              >
                Limpar carrinho
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
