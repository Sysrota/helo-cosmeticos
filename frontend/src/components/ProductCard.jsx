import { Link } from "react-router-dom";

export default function ProductCard({ id, image, title, price }) {
  const hasImage = Boolean(image);

  return (
    <Link to={`/produto/${id}`}>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">
        <div className="relative w-full h-72 overflow-hidden bg-helo-background rounded-t-2xl">
          {hasImage ? (
            <img
              src={image}
              alt={title}
              className="absolute inset-0 w-full h-full object-contain object-center rounded-t-2xl"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-helo-text/70 font-body">
              Sem imagem
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-display text-xl text-helo-dark">{title}</h3>
          <p className="text-helo-text/80 mt-1 font-body">{price}</p>
          <button
            type="button"
            className="mt-4 w-full py-3 bg-helo-dark text-white rounded-xl font-semibold hover:bg-helo-rose transition-colors"
          >
            Ver Detalhes
          </button>
        </div>
      </div>
    </Link>
  );
}
