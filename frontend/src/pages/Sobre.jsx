import {
  ArrowRight,
  CreditCard,
  Droplets,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { createElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "/helo-logo.png";
import { buildWhatsAppUrl } from "../constants/store";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const values = [
  {
    icon: Heart,
    title: "Delicadeza",
    text: "Cuidado pensado para transformar a rotina em um momento leve e especial.",
  },
  {
    icon: Droplets,
    title: "Conforto na pele",
    text: "Texturas agradáveis para hidratação e limpeza sem pesar no dia a dia.",
  },
  {
    icon: Sparkles,
    title: "Beleza real",
    text: "Produtos que valorizam autocuidado, bem-estar e confiança.",
  },
];

export default function Sobre() {
  const { pixLabel, cardLabel, freeShippingLabel } = useCommercialPolicy();
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const trustItems = [
    {
      icon: ShieldCheck,
      title: "Compra protegida",
      text: "Pagamento seguro pelo Mercado Pago.",
    },
    {
      icon: Truck,
      title: "Frete promocional",
      text: `${freeShippingLabel} para qualquer localidade atendida.`,
    },
    {
      icon: CreditCard,
      title: "PIX ou cartão",
      text: `${pixLabel}, ${cardLabel}.`,
    },
  ];

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        const featuredResponse = await fetch(
          `${API_URL}/products?active=true&featured=true&limit=1`
        );
        const featuredData = await featuredResponse.json();
        let product = featuredData.items?.[0];

        if (!product) {
          const fallbackResponse = await fetch(
            `${API_URL}/products?active=true&limit=1&sort=new`
          );
          const fallbackData = await fallbackResponse.json();
          product = fallbackData.items?.[0];
        }

        if (active) {
          setFeaturedProduct(product || null);
        }
      } catch {
        if (active) {
          setFeaturedProduct(null);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, []);

  const productImage = featuredProduct?.image_url
    ? `${API_URL}${featuredProduct.image_url}`
    : logo;
  const productRoute = featuredProduct
    ? `/produto/${featuredProduct.id}`
    : "/produtos";

  return (
    <div className="min-h-screen bg-[#fff8fa]">
      <section className="relative overflow-hidden border-b border-[#f0e2e7] bg-white">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#fce8ed] blur-3xl" />
        <div className="home-container relative grid items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74662]">
              <Sparkles size={14} />
              A essência Helô
            </p>
            <h1 className="mt-6 font-display text-4xl leading-tight text-[#43232d] sm:text-5xl">
              Cuidado que nasceu
              <span className="block text-[#d9536f]">de uma história de amor.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              A Helô Cosméticos transforma carinho em rituais de autocuidado,
              com produtos criados para uma beleza leve, confortável e real.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={productRoute}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9536f] px-8 font-semibold text-white transition hover:bg-[#c84b67]"
              >
                Conhecer a linha
                <ArrowRight size={18} />
              </Link>
              <a
                href={buildWhatsAppUrl(
                  "Olá! Quero conhecer melhor os produtos da Helô Cosméticos."
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e6c8d0] bg-white px-7 font-semibold text-[#873c50] transition hover:border-[#d9536f]"
              >
                <MessageCircle size={18} />
                Falar com a Helô
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[470px] rounded-[2rem] border border-[#f0e2e7] bg-[#fffafb] p-6 shadow-[0_22px_62px_rgba(91,39,56,0.08)] sm:p-8">
            <div className="flex items-center gap-3 border-b border-[#f0e2e7] pb-5">
              <img src={logo} alt="" className="h-14 w-14 rounded-full object-cover" />
              <div>
                <p className="font-display text-xl text-[#43232d]">Helô Cosméticos</p>
                <p className="text-xs uppercase tracking-[0.18em] text-[#b74662]">
                  Cuidado com identidade
                </p>
              </div>
            </div>
            <Link to={productRoute} className="mt-6 block rounded-3xl bg-white p-4">
              <div className="h-[270px]">
                <img
                  src={productImage}
                  alt={featuredProduct?.title || "Helô Cosméticos"}
                  className="h-full w-full object-contain"
                />
              </div>
              {featuredProduct && (
                <p className="mt-4 text-center font-display text-xl text-[#43232d]">
                  {featuredProduct.title}
                </p>
              )}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-container py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[2rem] border border-[#f0e2e7] bg-[#fff1f5] p-8 text-[#43232d] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b74662]">
              Nossa origem
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight">
              Inspirada em quem ilumina nossos dias
            </h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-zinc-600 sm:text-lg">
            <p>
              A Helô Cosméticos nasceu como uma homenagem à nossa filha,
              Heloísa. Seu nome carrega amor, delicadeza e presença, valores
              que orientam tudo o que construímos.
            </p>
            <p>
              Criamos uma marca para tornar o autocuidado mais prazeroso:
              produtos que acompanham a rotina com leveza, conforto e atenção
              aos detalhes.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0e2e7] bg-white py-16 lg:py-20">
        <div className="home-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b74662]">
              Nosso cuidado na prática
            </p>
            <h2 className="mt-4 font-display text-3xl text-[#43232d] sm:text-4xl">
              Beleza leve para todos os dias
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Nossa linha foi pensada para integrar cuidado e conforto em uma
              rotina simples, agradável e elegante.
            </p>
          </div>

          <div className="mt-11 grid gap-5 md:grid-cols-3">
            {values.map(({ icon, title, text }) => (
              <article
                key={title}
                className="rounded-3xl border border-[#f0e2e7] bg-[#fffafb] p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f4] text-[#d9536f]">
                  {createElement(icon, { size: 23 })}
                </span>
                <h3 className="mt-5 font-display text-2xl text-[#43232d]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-container py-16 lg:py-20">
        <div className="rounded-[2rem] border border-[#f0e2e7] bg-white p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b74662]">
                Confiança
              </p>
              <h2 className="mt-4 font-display text-3xl text-[#43232d]">
                Compre com tranquilidade
              </h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">
                Da escolha à entrega, oferecemos uma experiência clara e
                segura para seu cuidado chegar até você.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {trustItems.map(({ icon, title, text }) => (
                <article key={title} className="rounded-2xl bg-[#fff7f9] p-5">
                  {createElement(icon, {
                    size: 21,
                    className: "text-[#d9536f]",
                  })}
                  <h3 className="mt-4 text-sm font-semibold text-[#43232d]">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#f0e2e7] bg-[#fff1f5]">
        <div className="home-container py-14 text-center sm:py-16">
          <p className="mx-auto inline-flex rounded-full border border-[#ead1d8] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74662]">
            Marca e identidade
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl font-display text-3xl leading-tight text-[#43232d] sm:text-4xl">
            Helô Cosméticos é uma marca devidamente registrada do Grupo HRG.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
            Uma identidade construída com carinho para acompanhar seus
            momentos de cuidado e autoestima.
          </p>
          <Link
            to="/produtos"
            className="mt-9 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#d9536f] px-9 font-semibold text-white transition hover:bg-[#e56f89]"
          >
            Comprar produtos
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
