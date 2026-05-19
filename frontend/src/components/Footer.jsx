export default function Footer() {
  return (
    <footer
      className="
        bg-white/80
        backdrop-blur-xl
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
          py-6
          flex
          flex-col
          md:flex-row
          items-center
          justify-between
          gap-4
        "
      >
        {/* Marca */}
        <div className="text-center md:text-left">
          <h3
            className="
              font-display
              text-xl
              text-helo-dark
            "
          >
            Helô Cosméticos
          </h3>

          <p
            className="
              text-sm
              text-helo-text/70
              mt-1
            "
          >
            Beleza, cuidado e autoestima em cada detalhe.
          </p>
        </div>

        {/* Links */}
        <div
          className="
            flex
            items-center
            gap-6
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

          <a
            href="/produtos"
            className="
              hover:text-helo-rose
              transition-colors
            "
          >
            Produtos
          </a>

          <a
            href="/sobre"
            className="
              hover:text-helo-rose
              transition-colors
            "
          >
            Sobre
          </a>

          <a
            href="/contato"
            className="
              hover:text-helo-rose
              transition-colors
            "
          >
            Contato
          </a>
        </div>

        {/* Direitos */}
        <div
          className="
            text-sm
            text-helo-text/60
            text-center
            md:text-right
          "
        >
          © {new Date().getFullYear()} Helô Cosméticos
          <br />
          Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}