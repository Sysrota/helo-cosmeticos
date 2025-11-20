import { Link } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/produtos", label: "Produtos" },
    { to: "/sobre", label: "Sobre" },
    { to: "/contato", label: "Contato" },
    { to: "/carrinho", label: "Carrinho" },
  ];

  return (
    <header className="
      sticky top-0 z-50 
      backdrop-blur-xl 
      bg-white/60 
      border-b border-white/30 
      shadow-[0_4px_12px_rgba(0,0,0,0.06)]
      animate-fade-in
    ">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo */}
        <Link
          to="/"
          className="text-3xl font-display text-helo-dark tracking-wide hover:text-helo-rose transition-colors"
        >
          Helô Cosméticos
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex gap-8 text-helo-dark/80 font-body text-lg">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative group hover:text-helo-dark transition-colors"
            >
              {item.label}
              <span className="
                absolute left-0 -bottom-1 w-0 h-[2px] 
                bg-helo-rose transition-all duration-300 group-hover:w-full
              "></span>
            </Link>
          ))}
        </nav>

        {/* Mobile Button */}
        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-helo-rose text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/90 backdrop-blur-xl px-6 pb-6 shadow-lg animate-slide-down">
          <nav className="flex flex-col gap-4 text-lg font-body text-helo-dark">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="py-2 border-b border-helo-rose/20 hover:text-helo-rose transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
