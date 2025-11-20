import { Link } from "react-router-dom";

export default function ProductCard({ id, image, title, price }) {
  return (
    <Link to={`/produto/${id}`}>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer">

        <div className="w-full h-60 overflow-hidden">
          <img 
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5">
          <h3 className="font-display text-xl text-helo-dark">{title}</h3>
          <p className="text-helo-text/80 mt-1 font-body">{price}</p>
          <button className="mt-4 w-full py-3 bg-helo-dark text-white rounded-xl font-semibold hover:bg-helo-rose transition-colors">
            Ver Detalhes
          </button>
        </div>

      </div>
    </Link>
  );
}
