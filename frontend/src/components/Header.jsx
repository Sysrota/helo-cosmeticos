import { Link } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/produtos", label: "Produtos" },
    { to: "/sobre", label: "Sobre" },
    { to: "/contato", label: "Contato" },
  ];

  return (
    <header
      className="
        sticky
        top-0
        z-50
        bg-white/75
        backdrop-blur-lg
        border-b
        border-helo-rose/10
      "
    >
      <div
        className="
          max-w-7xl
          mx-auto
          px-6
          h-[72px]
          flex
          items-center
          justify-between
        "
      >
        {/* Logo */}
        <Link
          to="/"
          className="
            font-display
            text-2xl
            text-helo-dark
            tracking-wide
            transition-colors
            hover:text-helo-rose
          "
        >
          Helô Cosméticos
        </Link>

        {/* Desktop */}
        <div
          className="
            hidden
            md:flex
            items-center
            gap-10
          "
        >
          <nav
            className="
              flex
              items-center
              gap-6
              text-sm
              font-medium
              text-helo-text/80
            "
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="
                  relative
                  transition-colors
                  hover:text-helo-dark
                  group
                "
              >
                {item.label}

                <span
                  className="
                    absolute
                    left-0
                    -bottom-1
                    w-0
                    h-[1.5px]
                    bg-helo-rose
                    transition-all
                    duration-300
                    group-hover:w-full
                  "
                />
              </Link>
            ))}
          </nav>

          {/* Carrinho */}
          <Link
            to="/carrinho"
            className="
              px-5
              py-2.5
              rounded-xl
              bg-helo-dark
              text-white
              text-sm
              font-semibold
              transition-all
              hover:bg-helo-rose
              hover:shadow-lg
            "
          >
            Carrinho
          </Link>
        </div>

        {/* Mobile button */}
        <button
          className="
            md:hidden
            w-10
            h-10
            rounded-xl
            bg-helo-dark
            text-white
            flex
            items-center
            justify-center
            text-lg
            transition-all
            hover:bg-helo-rose
          "
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="
            md:hidden
            bg-white/95
            backdrop-blur-xl
            border-t
            border-helo-rose/10
            px-6
            py-5
          "
        >
          <nav
            className="
              flex
              flex-col
              gap-1
            "
          >
            {[...navItems, { to: "/carrinho", label: "Carrinho" }].map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="
                    py-3
                    px-2
                    rounded-lg
                    text-helo-dark
                    transition-all
                    hover:bg-helo-rose/10
                    hover:text-helo-rose
                  "
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}