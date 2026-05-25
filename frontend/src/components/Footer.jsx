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
            <a
              href="/"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Início
            </a>

            <span className="text-helo-rose/20">
              |
            </span>

            <a
              href="/produtos"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Produtos
            </a>

            <span className="text-helo-rose/20">
              |
            </span>

            <a
              href="/sobre"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Sobre
            </a>

            <span className="text-helo-rose/20">
              |
            </span>

            <a
              href="/contato"
              className="
                hover:text-helo-rose
                transition-colors
              "
            >
              Contato
            </a>
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
              href="#"
              className="
                text-helo-rose/80
                hover:text-helo-rose
                transition-colors
              "
            >
              Instagram
            </a>

            <a
              href="#"
              className="
                text-helo-rose/80
                hover:text-helo-rose
                transition-colors
              "
            >
              WhatsApp
            </a>

            <a
              href="#"
              className="
                text-helo-rose/80
                hover:text-helo-rose
                transition-colors
              "
            >
              E-mail
            </a>
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

          <span>
            Uma marca do Grupo HRG
          </span>

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