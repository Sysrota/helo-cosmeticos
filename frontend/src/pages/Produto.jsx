import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";

// const API_URL = "http://localhost:3333";
const API_URL = import.meta.env.VITE_API_URL || "/api";


function formatBRL(v) {
  const n = Number(v || 0);
  return n.toFixed(2).replace(".", ",");
}

export default function Produto() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState("");

  const cover = useMemo(() => {
    if (!product) return "";
    return product.image_url ? `${API_URL}${product.image_url}` : "";
  }, [product]);

  const gallery = useMemo(() => {
    if (!product?.images?.length) return [];
    return product.images
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => ({
        ...img,
        full: `${API_URL}${img.image_url}`,
      }));
  }, [product]);

  const sentirList = useMemo(() => {
    const raw = product?.o_que_vai_sentir || "";
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [product]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (!res.ok) throw new Error("Produto não encontrado");
        const data = await res.json();

        if (!alive) return;
        setProduct(data);

        const first =
          data.image_url
            ? `${API_URL}${data.image_url}`
            : data.images?.[0]?.image_url
            ? `${API_URL}${data.images[0].image_url}`
            : "";

        setSelected(first);
      } catch {
        if (!alive) return;
        setProduct(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const mainImage = selected || cover;

  if (loading) {
    return (
      <div className="bg-helo-background min-h-screen py-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-helo-text/70">
          Carregando produto...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-helo-background min-h-screen py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-display text-helo-dark">Produto não encontrado</h1>
          <p className="text-helo-text/80 mt-2">Verifique o link ou tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-helo-background min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-14 items-start">
        {/* COLUNA ESQUERDA: GALERIA + DICAS/FEEL */}
        <div className="space-y-6">
          {/* GALERIA */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden shadow-xl bg-white/70 backdrop-blur-xl border border-white/40">
              <div className="w-full h-[520px] bg-helo-background overflow-hidden">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-contain object-center rounded-t-2xl"
                    style={{ objectPosition: "center top" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-helo-text/70">
                    Sem imagem
                  </div>
                )}
              </div>
            </div>

{gallery.length > 0 ? (
  <div className="grid grid-cols-5 gap-3">
    {Array.from(
      new Map(
        [{ id: "cover", full: cover }, ...gallery]
          .filter((g) => Boolean(g.full))
          .map((g) => [g.full, g]) // chave = url
      ).values()
    )
      .slice(0, 10)
      .map((img) => {
        const active = img.full === mainImage;
        return (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelected(img.full)}
            className={`rounded-xl overflow-hidden border bg-white/70 backdrop-blur-xl transition-all ${
              active ? "border-helo-rose shadow-md" : "border-white/40 hover:shadow"
            }`}
            title="Ver imagem"
          >
            <div className="w-full h-20 bg-helo-background">
              <img src={img.full} alt="" className="w-full h-full object-contain" />
            </div>
          </button>
        );
      })}
  </div>
) : null}

          </div>

          {/* DICAS DE USO (abaixo da galeria) */}
          {product.dicas_uso ? (
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow p-6">
              <h3 className="text-xl font-display text-helo-dark mb-2">Dicas de uso</h3>
              <p className="text-helo-text/90 leading-relaxed">{product.dicas_uso}</p>
            </div>
          ) : null}

          {/* O QUE VAI SENTIR (abaixo da galeria) */}
          {sentirList.length > 0 ? (
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow p-6">
              <h3 className="text-xl font-display text-helo-dark mb-3">O que você vai sentir</h3>
              <ul className="list-disc list-inside text-helo-text/90 space-y-1">
                {sentirList.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* COLUNA DIREITA: INFO (alinhada no topo da galeria) */}
        <div className="flex flex-col justify-start md:sticky md:top-24 h-fit">
          <h1 className="text-4xl md:text-5xl font-display text-helo-dark leading-tight">
            {product.title}
          </h1>

          {product.subtitle ? (
            <p className="text-helo-text/80 mt-3 font-body text-lg">{product.subtitle}</p>
          ) : null}

          <div className="mt-6 flex items-end gap-3">
            <p className="text-helo-dark text-3xl font-display">R$ {formatBRL(product.price)}</p>
            {product.is_active === false ? (
              <span className="text-xs px-3 py-1 rounded-full bg-white/70 border border-white/40 text-helo-text/80">
                Indisponível
              </span>
            ) : null}
          </div>

          <button
            className="mt-6 px-8 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold hover:bg-helo-rose transition-all shadow-md hover:shadow-lg disabled:opacity-60"
            disabled={product.is_active === false}
            onClick={() =>
              addToCart({
                id: product.id,
                title: product.title,
                price: Number(product.price || 0),
                image: mainImage || cover || "",
              })
            }
          >
            Adicionar ao carrinho
          </button>

          {/* DESCRIÇÃO */}
          <div className="mt-10">
            <h2 className="text-2xl font-display text-helo-dark mb-3">Descrição</h2>
            <p className="text-helo-text/90 leading-relaxed">
              {product.description || "Sem descrição cadastrada."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
