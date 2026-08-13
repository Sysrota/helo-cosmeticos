import { Sparkles } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${API_URL.replace(/\/$/, "")}${imageUrl}`;
}

// Seção "O que vem no Kit" — só aparece quando o produto tem
// category === "kit" e tem ao menos um item vinculado (product.kit_items).
// Cada item aponta pra um produto real do catálogo (item_product) — nome,
// imagem e descrição vêm sempre de lá, nunca digitados de novo.
export default function ProductKitContents({ items = [], kitTitle }) {
  if (!items.length) return null;

  return (
    <section className="product-kit-contents mt-6 bg-white p-7 sm:p-9">
      <h2 className="font-display text-3xl text-[#43232d]">
        O que vem no{kitTitle ? ` ${kitTitle}` : ""}
      </h2>

      <div className="mt-5 grid gap-x-6 gap-y-5 sm:mt-6 sm:grid-cols-2 sm:gap-y-7 lg:grid-cols-4">
        {items.map((item) => {
          const itemProduct = item.item_product;
          if (!itemProduct) return null;

          const image = resolveImageUrl(
            itemProduct.images?.[0]?.image_url || itemProduct.image_url
          );
          const title = itemProduct.sales_title || itemProduct.title;

          return (
            <div key={item.id}>
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#fff1f5]">
                  <Sparkles size={20} className="text-[#d9536f]" />
                </div>
              )}
              <p className="mt-3 text-sm font-semibold text-[#43232d]">
                {title}
              </p>
              {itemProduct.subtitle && (
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {itemProduct.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
