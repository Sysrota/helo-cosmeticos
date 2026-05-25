import {
  Boxes,
  ExternalLink,
  LogOut,
  MessageSquareText,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import logo from "/helo-logo.png";

const adminItems = [
  {
    to:
      "/admin/produtos",
    label:
      "Produtos",
    icon:
      Boxes,
  },
  {
    to:
      "/admin/attendance",
    label:
      "Atendimento",
    icon:
      MessageSquareText,
  },
  {
    to:
      "/admin/clientes",
    label:
      "Clientes",
    icon:
      Users,
  },
  {
    to:
      "/admin/orders",
    label:
      "Pedidos",
    icon:
      ShoppingBag,
  },
  {
    to:
      "/admin/settings",
    label:
      "Configurações",
    icon:
      Settings,
  },
];

export default function AdminLayout() {
  const {
    logout,
  } = useAuth();
  const navigate =
    useNavigate();

  function handleLogout() {
    logout();
    navigate(
      "/admin/login",
      {
        replace: true,
      }
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4f3] text-[#43232d]">
      <header className="sticky top-0 z-50 border-b border-[#f0dfe5] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link
            to="/admin/produtos"
            className="flex shrink-0 items-center gap-3"
          >
            <img
              src={logo}
              alt=""
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="hidden sm:block">
              <p className="font-display text-lg leading-none text-[#43232d]">
                Helô Cosméticos
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c14b66]">
                Administrativo
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="hidden items-center gap-2 rounded-xl border border-[#eedde3] px-3 py-2 text-xs font-semibold text-[#765460] transition hover:bg-[#fff5f8] sm:flex"
            >
              <ExternalLink size={15} />
              Ver loja
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-[#fff1f5] px-3 py-2 text-xs font-semibold text-[#b74662] transition hover:bg-[#fce4eb]"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">
                Sair
              </span>
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-3 lg:px-6">
          {adminItems.map(
            (item) => {
              const Icon =
                item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({
                    isActive,
                  }) =>
                    `flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#d9536f] text-white shadow-sm"
                        : "text-[#765460] hover:bg-[#fff1f5] hover:text-[#b74662]"
                    }`
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              );
            }
          )}
        </nav>
      </header>

      <Outlet />
    </div>
  );
}
