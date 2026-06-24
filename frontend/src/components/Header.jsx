import {
  CreditCard,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import logo from "/helo-logo.png";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

const navItems = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Produtos" },
  { to: "/sobre", label: "A Helô" },
  { to: "/acompanhar-pedido", label: "Meus pedidos" },
  { to: "/contato", label: "Contato" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { totalItems } = useCart();
  const hasItems = totalItems > 0;
  const {
    pixLabel,
    cardLabel,
    freeShippingLabel,
    pix_discount_percent: pixDiscountPercent,
    card_interest_free_installments: interestFreeInstallments,
  } = useCommercialPolicy();
  const hasPixDiscount = Number(pixDiscountPercent) > 0;
  const { pathname } = useLocation();
  const isProductPage = /^\/produto\//.test(pathname);
  const topBenefits = [
    hasPixDiscount
      ? {
          icon: Sparkles,
          text: pixLabel,
          strong: true,
        }
      : null,
    {
      icon: Truck,
      text: freeShippingLabel,
    },
    {
      icon: CreditCard,
      text: cardLabel,
    },
    {
      icon: ShieldCheck,
      text: "Compra segura",
    },
  ].filter(Boolean);

  useEffect(() => {
    function handleScroll() {
      setCompact(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#f0dfe5] bg-white/95 backdrop-blur-xl">
      <div className="hidden border-b border-[#f5e5ea] bg-[#fff8fa]/95 px-4 py-2 text-center text-xs text-[#6b4b55] sm:block">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          {topBenefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <span key={benefit.text} className="inline-flex items-center gap-x-5">
                {index > 0 && <span className="h-3 w-px bg-[#ead1d8]" />}
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={13} className="text-[#d9536f]" />
                  {benefit.strong ? (
                    <strong className="font-semibold text-[#43232d]">
                      {benefit.text}
                    </strong>
                  ) : (
                    <span>{benefit.text}</span>
                  )}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className={`
        overflow-hidden border-b border-[#f5e5ea] bg-[#fff8fa] text-center text-[#43232d] transition-all duration-300 sm:hidden
        ${compact || isProductPage ? "max-h-0 px-4 py-0 opacity-0" : "max-h-[58px] px-4 py-2.5 opacity-100"}
      `}>
        <p className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.04em]">
          {hasPixDiscount && (
            <>
              <span>{pixLabel}</span>
              <span className="h-3 w-px bg-[#e7c6cf]" />
            </>
          )}
          <span>{interestFreeInstallments}x sem juros</span>
        </p>
        <p className="mt-1 text-[11px] font-medium tracking-[0.01em] text-[#874052]">
          {freeShippingLabel}
        </p>
      </div>

      <div className={`
        home-container flex items-center justify-between gap-3 transition-all duration-300 sm:h-[78px] sm:gap-5
        ${compact ? "h-[58px]" : "h-[68px]"}
      `}>
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2.5 sm:gap-3"
          aria-label="Helô Cosméticos - Página inicial"
        >
          <img
            src={logo}
            alt=""
            className={`
              rounded-full object-cover transition-all duration-300 sm:h-[54px] sm:w-[54px]
              ${compact ? "h-[40px] w-[40px]" : "h-[46px] w-[46px]"}
            `}
          />
          <span className="block">
            <span className={`
              block font-display leading-none text-[#43232d] transition-all duration-300 sm:text-[1.4rem]
              ${compact ? "text-[0.98rem]" : "text-[1.05rem]"}
            `}>
              Helô
            </span>
            <span className={`
              block font-semibold uppercase text-[#b74662] transition-all duration-300 sm:mt-1 sm:text-[0.62rem] sm:tracking-[0.3em]
              ${compact ? "mt-0.5 text-[0.46rem] tracking-[0.2em]" : "mt-1 text-[0.5rem] tracking-[0.23em]"}
            `}>
              Cosméticos
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav className="flex items-center gap-7">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `relative py-3 text-sm font-medium transition ${
                    isActive
                      ? "text-[#b74662]"
                      : "text-zinc-600 hover:text-[#43232d]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-1 left-0 h-[2px] w-full rounded-full bg-[#d9536f]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <Link
            to="/carrinho"
            className={`relative inline-flex h-12 items-center gap-2 rounded-2xl bg-[#d9536f] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c84b67] ${hasItems ? "cart-attention" : ""}`}
          >
            <ShoppingBag size={18} />
            Carrinho
            {hasItems && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#43232d] px-1.5 text-xs text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            to="/carrinho"
            className={`
              relative flex items-center justify-center rounded-xl border border-[#ecd9df] text-[#b74662] transition-all duration-300 sm:h-11 sm:w-11
              ${compact ? "h-9 w-9" : "h-10 w-10"}
              ${hasItems ? "cart-attention" : ""}
            `}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag size={19} />
            {hasItems && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9536f] px-1 text-[11px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            className={`
              flex items-center justify-center rounded-xl bg-[#d9536f] text-white transition-all duration-300 sm:h-11 sm:w-11
              ${compact ? "h-9 w-9" : "h-10 w-10"}
            `}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[#f0dfe5] bg-white px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#fff1f5] text-[#b74662]"
                      : "text-zinc-700 hover:bg-[#fff7f9]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
