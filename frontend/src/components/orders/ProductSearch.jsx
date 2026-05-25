import {
  useMemo,
  useState,
} from "react";

import Formatter
  from "@/utils/Formatter";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

export function ProductSearch({
  products,
  addProduct,
}) {


  const [search,
    setSearch] =
    useState("");

  const filteredProducts =
    useMemo(() => {

      return (products || [])
        .filter(
          (product) => {
            return product.title
              ?.toLowerCase()
              ?.includes(
                search.toLowerCase()
              );
          }
        )
        .sort(
          (first, second) =>
            Number(Boolean(second.is_featured)) -
              Number(Boolean(first.is_featured)) ||
            first.title.localeCompare(
              second.title,
              "pt-BR"
            )
        );

    }, [products, search]);

  return (
    <div className="
      bg-white
      rounded-2xl
      border
      border-zinc-200
      p-4
    ">

      {/* HEADER */}
      <div className="
        mb-2
      ">

        <h2 className="
          text-2xl
          font-bold
        ">
          Adicionar Produto
        </h2>

        <p className="
          text-zinc-500
          mt-1
        ">
          Pesquise e adicione produtos rapidamente
        </p>
      </div>

      {/* SEARCH */}
      <input
        value={search}

        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }

        placeholder="
          Pesquisar produto...
        "

        className="
          w-full

          border
          border-zinc-200

          rounded-2xl

          px-5
          py-2

          outline-none

          focus:border-black

          transition-all
        "
      />

      {/* RESULTS */}
      <div className="
        mt-5

        grid
        grid-cols-1
        lg:grid-cols-2

        gap-2
      ">

        {search.trim() &&
        filteredProducts
            .slice(0, 8)
            .map((product) => (

          <button
            key={product.id}

            onClick={() => {
              addProduct(
                product
              );
                setSearch("");
                }
            }

            className="
              border
              border-zinc-200

              rounded-2xl

              p-4

              flex
              items-center
              justify-between

              hover:border-black
              hover:bg-zinc-50

              transition-all
            "
          >

            <div className="
              flex
              items-center
              gap-2
            ">

              <div className="
                w-16
                h-16

                rounded-2xl

                bg-zinc-100

                overflow-hidden
                shrink-0
              ">

            {product.image_url && (

            <img
                src={`${API_URL}${product.image_url}`}

                alt={product.title}

                className="
                w-full
                h-full
                object-cover
                "
            />
            )}
              </div>

              <div className="
                text-left
              ">

                <div className="
                  font-semibold
                  text-zinc-900
                ">
                  {product.title}
                </div>

                {product.is_featured && (
                  <span className="
                    mt-1
                    inline-flex
                    rounded-full
                    bg-[#fff0f4]
                    px-2
                    py-0.5
                    text-[11px]
                    font-semibold
                    text-[#b74662]
                  ">
                    Destaque
                  </span>
                )}

                <div className="
                  text-sm
                  text-zinc-500
                  mt-1
                ">
                  {Formatter.formataMoeda(
                    product.price
                  )}
                </div>
              </div>
            </div>

            <div className="
              w-10
              h-10

              rounded-full

              bg-black
              text-white

              flex
              items-center
              justify-center

              text-xl

              shrink-0
            ">
              +
            </div>
          </button>
        ))}

        {search.trim() &&
            filteredProducts.length ===
                0 && (

          <div className="
            text-zinc-500
            py-10
          ">
            Nenhum produto encontrado
          </div>
        )}
      </div>
    </div>
  );
}
