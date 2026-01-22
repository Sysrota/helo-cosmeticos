import { Link } from "react-router-dom";
import logo from "/helo-logo.png";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-helo-light to-helo-background pt-10 md:pt-24 pb-10 md:pb-16">
      {/* Glow premium */}
      <div className="absolute top-[-120px] left-[-120px] w-[360px] h-[360px] bg-helo-rose/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-140px] right-[-140px] w-[420px] h-[420px] bg-helo-rose/35 rounded-full blur-[150px] opacity-80" />

      {/* Grain/noise sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundSize: "220px 220px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
        {/* LEFT */}
        <div className="animate-fade-in text-center md:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display text-helo-dark leading-[1.05] tracking-tight mb-6">
            Beleza com <span className="text-helo-rose">delicadeza</span>.
          </h1>

          <p className="text-lg md:text-xl text-helo-text/80 font-body max-w-xl mx-auto md:mx-0 leading-relaxed mb-8">
            Cosméticos desenvolvidos com carinho, criados para realçar sua beleza
            com leveza, suavidade e um toque especial.
          </p>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {/* Principal: hover mais claro */}
            <Link
              to="/produtos"
              className="group px-8 py-4 bg-helo-dark text-white font-semibold rounded-xl shadow-lg transition-all hover:shadow-xl hover:bg-helo-rose hover:-translate-y-[1px] active:translate-y-0"
            >
              <span className="inline-flex items-center gap-2">
                Ver Produtos
                <span className="opacity-80 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </span>
            </Link>

            {/* Secundário: hover mais claro */}
            <a
              href="https://wa.me/5562982287272"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 bg-helo-rose text-white font-semibold rounded-xl shadow-md transition-all hover:shadow-lg hover:bg-helo-light hover:text-helo-dark hover:-translate-y-[1px] active:translate-y-0"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-lg">💬</span> Falar com a Helô
              </span>
            </a>
          </div>

          {/* Badges */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
            <span className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl border border-white/40 text-sm text-helo-text/80 shadow-sm">
              🚚 Envio rápido
            </span>
            <span className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl border border-white/40 text-sm text-helo-text/80 shadow-sm">
              🔒 Compra segura
            </span>
            <span className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl border border-white/40 text-sm text-helo-text/80 shadow-sm">
              💗 Atendimento no WhatsApp
            </span>
          </div>
        </div>

        {/* RIGHT — LOGO com hover */}
        <div className="flex justify-center animate-fade-in-delay">
          {/* group para controlar hover em tudo */}
          <div className="relative group">
            {/* anel externo (ganha brilho no hover) */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-helo-rose/25 to-white/10 blur-[2px] transition-opacity duration-300 group-hover:opacity-100 opacity-80" />
            {/* anel interno (fica mais evidente no hover) */}
            <div className="absolute -inset-1 rounded-full border border-helo-rose/20 transition-all duration-300 group-hover:border-helo-rose/40" />

            <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] bg-white/70 backdrop-blur-xl flex items-center justify-center border border-white/50 overflow-hidden transition-all duration-300 group-hover:shadow-[0_18px_60px_rgba(0,0,0,0.18)] group-hover:-translate-y-[2px]">
              {/* highlight premium (aumenta no hover) */}
              <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[140%] h-[60%] bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[10px] opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

              {/* brilho rosé que “passa” no hover */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute -left-1/2 top-1/2 -translate-y-1/2 w-[60%] h-[140%] rotate-12 bg-gradient-to-r from-transparent via-helo-rose/25 to-transparent blur-[2px] animate-[shimmer_1.6s_ease-in-out_infinite]" />
              </div>

              <img
                src={logo}
                alt="Helô Cosméticos"
                className="w-full h-full object-contain scale-[1] transition-transform duration-1000 group-hover:scale-[1.15]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* keyframes shimmer (Tailwind não tem por padrão, então usamos style global) */}
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-30%) translateY(-50%) rotate(12deg); opacity: 0; }
            25% { opacity: 1; }
            50% { transform: translateX(220%) translateY(-50%) rotate(12deg); opacity: 1; }
            75% { opacity: 0.6; }
            100% { transform: translateX(260%) translateY(-50%) rotate(12deg); opacity: 0; }
          }
        `}
      </style>
    </section>
  );
}
