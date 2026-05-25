import { Menu, ShoppingBag, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import logo from "/helo-logo.png";

const navItems = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Produtos" },
  { to: "/sobre", label: "A Helô" },
  { to: "/contato", label: "Contato" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const hasItems = totalItems > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-[#f0dfe5] bg-white/95 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#fff1f5] px-4 py-2 text-center text-xs font-medium tracking-wide text-[#43232d] sm:text-sm">
        <span className="font-bold">10% OFF no PIX</span>
        <span className="hidden text-[#43232d] sm:inline">|</span>
        <span className="font-bold">Frete grátis na região metropolitana de Goiânia</span>
        <span className="hidden text-[#43232d] sm:inline">|</span>
        <span className="font-bold">R$ 25,00 OFF para demais localizações</span>
        <span className="hidden text-[#43232d] sm:inline">|</span>
        <span className="font-bold">3x sem juros ou até 12x com juros</span>
      </div>

      <div className="home-container flex h-[78px] items-center justify-between gap-5">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-3"
          aria-label="Helô Cosméticos - Página inicial"
        >
          <img
            src={logo}
            alt=""
            className="h-[54px] w-[54px] rounded-full object-cover"
          />
          <span className="hidden sm:block">
            <span className="block font-display text-[1.4rem] leading-none text-[#43232d]">
              Helô
            </span>
            <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-[#b74662]">
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
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#ecd9df] text-[#b74662] ${hasItems ? "cart-attention" : ""}`}
            aria-label="Abrir carrinho"
          >
            <ShoppingBag size={20} />
            {hasItems && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9536f] px-1 text-[11px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d9536f] text-white"
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
