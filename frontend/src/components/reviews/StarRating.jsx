import { Star } from "lucide-react";

export default function StarRating({
  value = 0,
  onChange,
  size = 16,
  className = "",
}) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = typeof onChange === "function";

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        const icon = (
          <Star
            size={size}
            className={filled ? "fill-[#e8a33d] text-[#e8a33d]" : "text-[#e3d3d8]"}
          />
        );

        // Somente leitura (sem onChange): renderiza span, não button — evita
        // elemento desabilitado bloqueando clique quando usado dentro de
        // outro elemento clicável (ex: selo de nota em cima da imagem).
        if (!interactive) {
          return (
            <span key={star} aria-hidden="true">
              {icon}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="cursor-pointer"
            aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
