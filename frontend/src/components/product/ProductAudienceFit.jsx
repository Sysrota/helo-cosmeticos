import { motion as Motion } from "framer-motion";
import { Check } from "lucide-react";

import defaultAudienceImage from "../../assets/imagem-mulher-pele-limpa.png";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${API_URL.replace(/\/$/, "")}${imageUrl}`;
}

// Seção "Para quem é este produto?" — gera identificação imediata com o
// visitante logo no topo da página. Os itens vêm de `product.indicado_para`
// (uma indicação por linha, cadastrada no admin) — nunca fixos no código.
// Sem itens, a seção não é renderizada.
// `imageUrl` (product.audience_fit_image_url) é opcional — sem ela, usa a
// imagem padrão.
export default function ProductAudienceFit({ items = [], imageUrl }) {
  if (!items.length) return null;

  const resolvedImage = resolveImageUrl(imageUrl);
  const isDefaultImage = !resolvedImage;

  return (
    <section className="product-audience-fit mt-6 bg-white p-7 sm:p-9">
      <div className="grid items-center gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
        <div>
          <h2 className="font-display text-3xl text-[#43232d]">
            Para quem é este produto?
          </h2>

          {/* flex-wrap — nunca colunas fixas, os badges se distribuem sozinhos */}
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-2.5">
            {items.map((item, index) => (
              <Motion.span
                key={item}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-4 py-2 text-sm font-medium text-[#873c50]"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#d9536f] text-white">
                  <Check size={11} strokeWidth={3} />
                </span>
                {item}
              </Motion.span>
            ))}
          </div>
        </div>

        <div className="mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-[2rem] sm:max-w-sm lg:max-w-none">
          <img
            src={resolvedImage || defaultAudienceImage}
            alt=""
            className={`h-full w-full object-cover ${
              isDefaultImage ? "object-right" : "object-center"
            }`}
          />
        </div>
      </div>
    </section>
  );
}
