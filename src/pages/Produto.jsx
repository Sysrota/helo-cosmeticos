import { useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";


const placeholder = "https://placehold.co/600x800/F6E6E9/D9536F?text=Produto&font=Playfair+Display";

export default function Produto() {
  const { id } = useParams();
  const { addToCart } = useCart();

  // Dados provisórios do produto
  const product = {
    id,
    title: "Shampoo Delicato",
    subtitle: "Limpeza suave para todos os tipos de cabelo",
    price: 49.90,
    image: placeholder,
    description:
      "O Shampoo Delicato da Helô Cosméticos foi desenvolvido com foco em suavidade e cuidado. Fórmula leve, espuma cremosa e sensação de leveza instantânea.",
    benefits: [
      "Limpeza delicada e eficaz",
      "Sensação de frescor e leveza",
      "Ideal para uso diário",
      "Perfume suave e feminino",
      "Textura leve com toque macio",
    ],
    usage:
      "Aplique nos cabelos molhados, massageie suavemente até formar espuma e enxágue. Repita se necessário.",
  };

  return (
    <div className="bg-helo-background min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16">

        {/* IMAGEM */}
        <div className="rounded-xl overflow-hidden shadow-lg bg-white/60 backdrop-blur-md p-6">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-[450px] object-cover rounded-lg"
          />
        </div>

        {/* INFORMAÇÕES */}
        <div className="flex flex-col justify-center">

          <h1 className="text-4xl font-display text-helo-dark">{product.title}</h1>
          <p className="text-helo-text/80 mt-2 font-body">{product.subtitle}</p>

          <p className="text-helo-dark text-3xl font-display mt-6">
            R$ {product.price.toFixed(2)}
          </p>

        <button
        className="mt-6 px-8 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold hover:bg-helo-rose transition-all shadow-md hover:shadow-lg"
        onClick={() => addToCart({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
        })}
        >
        Adicionar ao carrinho
        </button>


          {/* DESCRIÇÃO */}
          <div className="mt-10">
            <h2 className="text-2xl font-display text-helo-dark mb-3">Descrição</h2>
            <p className="text-helo-text/90">{product.description}</p>
          </div>

          {/* BENEFÍCIOS */}
          <div className="mt-10">
            <h2 className="text-2xl font-display text-helo-dark mb-3">Benefícios</h2>
            <ul className="list-disc list-inside text-helo-text/90">
              {product.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          {/* MODO DE USO */}
          <div className="mt-10">
            <h2 className="text-2xl font-display text-helo-dark mb-3">Como usar</h2>
            <p className="text-helo-text/90">{product.usage}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
