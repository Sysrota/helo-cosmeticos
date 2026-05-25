import { Link } from "react-router-dom";
import { buildWhatsAppUrl } from "../constants/store";

export default function Footer() {
  return (
    <footer
      className="
        bg-white
        border-t
        border-helo-dark/10
        text-helo-text
      "
    >
      <div
        className="
          max-w-7xl
          mx-auto
          px-6
          py-4
        "
      >
        {/* TOP */}
        <div
          className="
            flex
            flex-col
            lg:flex-row
            items-center
            justify-between
            gap-3
          "
        >
          {/* Marca */}
          <div
            className="
              text-center
              lg:text-left
            "
          >
            <h3
              className="
                font-display
                text-xl
                text-helo-rose
              "
            >
              Helô Cosméticos
            </h3>

            <p
              className="
                mt-1
                text-sm
                text-helo-text/70
                leading-normal
              "
            >
              Beleza, cuidado e autoestima em cada detalhe.
            </p>
          </div>

          {/* Navegação */}
          <nav
            className="
              flex
              items-center
              flex-wrap
              justify-center
              gap-4
              text-sm
              font-medium
            "
          >
            <Link
              to="/"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Início
            </Link>

            <span className="text-helo-rose/20">
              |
            </span>

            <Link
              to="/produtos"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Produtos
            </Link>

            <span className="text-helo-rose/20">
              |
            </span>

            <Link
              to="/sobre"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Sobre
            </Link>

            <span className="text-helo-rose/20">
              |
            </span>

            <Link
              to="/contato"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Contato
            </Link>
          </nav>

          {/* Redes */}
          <div
            className="
              flex
              items-center
              gap-4
              text-sm
            "
          >
            <a
              href={buildWhatsAppUrl(
                "Olá! Vim pelo site da Helô Cosméticos e gostaria de atendimento."
              )}
              target="_blank"
              rel="noreferrer"
              className="
                text-helo-rose/80
                hover:text-helo-rose
                transition-colors
              "
            >
              WhatsApp
            </a>

            <Link
              to="/contato"
              className="
                text-helo-rose/80
                hover:text-helo-rose
                transition-colors
              "
            >
              Contato
            </Link>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="
            mt-3
            pt-3
            border-t
            border-helo-rose/10
            flex
            flex-col
            md:flex-row
            items-center
            justify-center
            gap-2
            text-xs
            text-helo-text/55
          "
        >
          <span>
            © {new Date().getFullYear()} Helô Cosméticos
          </span>

          <span className="hidden md:block">
            |
          </span>

          <a
              href="https://grupohrg.com.br"
              target="_blank"
              rel="noreferrer"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
             
          <span>
            Uma marca do Grupo HRG
          </span>
            </a>

          <span className="hidden md:block">
            |
          </span>

          <span>
            Todos os direitos reservados.
          </span>
        </div>
      </div>
    </footer>
  );
}
