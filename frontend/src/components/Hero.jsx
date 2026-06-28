import {
  ArrowRight,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "/helo-logo.png";
import { buildWhatsAppUrl } from "../constants/store";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Hero({ featuredProduct }) {
  const {
    pix_discount_percent: pixDiscountPercent,
    card_interest_free_installments: interestFreeInstallments,
    freeShippingLabel,
    pixEnabled,
    creditCardEnabled,
    show_secure_purchase: showSecurePurchase,
  } = useCommercialPolicy();
  const featuredImage = featuredProduct?.image_url
    ? `${API_URL}${featuredProduct.image_url}`
    : logo;
  const pixPrice =
    Number(featuredProduct?.price || 0) *
    (1 - pixDiscountPercent / 100);
  const hasPixDiscount =
    pixEnabled && Number(pixDiscountPercent) > 0;

  return (
    <section className="home-hero relative overflow-hidden">
      <div className="home-hero-glow home-hero-glow-left" />
      <div className="home-hero-glow home-hero-glow-right" />

      <div className="home-container relative z-10 grid items-center gap-8 py-8 lg:grid-cols-[1.08fr_0.82fr] lg:py-11">
        <div className="animate-fade-in text-center lg:text-left">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#f0dfe5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74662] lg:mx-0">
            <Sparkles size={14} />
            Cuidado premium para sua rotina
          </p>

          <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-[#43232d] sm:text-5xl lg:text-[3.25rem]">
            Sua pele merece um cuidado
            <span className="block text-[#d9536f]">delicado e irresistível.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg lg:mx-0">
            Descubra cosméticos Helô para um ritual leve, elegante e
            confortável. Compre online com {freeShippingLabel.toLowerCase()}.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            {featuredProduct ? (
              <Link
                to={`/produto/${featuredProduct.id}`}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9536f] px-8 font-semibold text-white shadow-[0_15px_30px_rgba(217,83,111,0.27)] transition hover:bg-[#c84b67]"
              >
                Comprar agora
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                to="/produtos"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9536f] px-8 font-semibold text-white shadow-[0_15px_30px_rgba(217,83,111,0.27)] transition hover:bg-[#c84b67]"
              >
                Ver produtos
                <ArrowRight size={18} />
              </Link>
            )}
            <a
              href={buildWhatsAppUrl(
                "Olá! Vim pelo site da Helô Cosméticos e gostaria de ajuda para escolher meus produtos."
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e7c6cf] bg-white px-7 font-semibold text-[#873c50] transition hover:border-[#d9536f] hover:text-[#d9536f]"
            >
              <MessageCircle size={18} />
              Falar com a Helô
            </a>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-zinc-600 lg:justify-start">
            {showSecurePurchase && (
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#d9536f]" />
                Compra segura
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <Truck size={17} className="text-[#d9536f]" />
              {freeShippingLabel}
            </span>
            {creditCardEnabled && (
              <span className="inline-flex items-center gap-2">
                <CreditCard size={17} className="text-[#d9536f]" />
                {interestFreeInstallments}x sem juros
              </span>
            )}
          </div>
        </div>

        <div className="animate-fade-in-delay">
          <Motion.div
            className="mx-auto max-w-[390px] sm:max-w-[420px]"
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <Link
              to={featuredProduct ? `/produto/${featuredProduct.id}` : "/produtos"}
              className="home-featured-product group relative block bg-white transition hover:-translate-y-1 hover:shadow-[0_30px_72px_rgba(91,39,56,0.14)]"
            >
              <span className="absolute left-4 top-4 z-10 rounded-full bg-[#fff1f5] px-3.5 py-1.5 text-xs font-semibold text-[#b74662]">
                Destaque Helô
              </span>

              <div className="home-featured-image">
                <img
                  src={featuredImage}
                  alt={featuredProduct?.title || "Helô Cosméticos"}
                  className={`h-full w-full transition duration-300 group-hover:scale-[1.02] ${
                    featuredProduct
                      ? "object-contain object-center p-4 sm:p-6"
                      : "object-contain p-9 sm:p-12"
                  }`}
                />
              </div>

              {featuredProduct && (
                <div className="border-t border-[#f2e6ea] px-5 py-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-display text-lg text-[#43232d]">
                        {featuredProduct.title}
                      </p>
                      {featuredProduct.subtitle && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-500">
                          {featuredProduct.subtitle}
                        </p>
                      )}
                      {hasPixDiscount && (
                        <p className="mt-1 text-sm text-zinc-500">
                          No PIX por{" "}
                          <strong className="text-[#b74662]">
                            {formatBRL(pixPrice)}
                          </strong>
                        </p>
                      )}
                    </div>
                    <p className="text-base font-semibold text-[#43232d]">
                      {formatBRL(featuredProduct.price)}
                    </p>
                  </div>
                </div>
              )}
            </Link>
          </Motion.div>
        </div>
      </div>
    </section>
  );
}
