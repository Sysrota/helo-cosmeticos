import { Link } from "react-router-dom";
import logo from "/helo-logo.png";
import { motion } from "framer-motion";

export default function Hero() {

  const whatsappMessage = encodeURIComponent(
    "Olá! Vim pelo site da Helô Cosméticos e gostaria de atendimento."
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-helo-light to-helo-background pt-6 md:pt-12 pb-6 md:pb-10">
      {/* Glow premium */}
      <div className="absolute top-[-120px] left-[-120px] w-[300px] h-[300px] bg-helo-rose/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-140px] right-[-140px] w-[320px] h-[320px] bg-helo-rose/25 rounded-full blur-[140px] opacity-70" />

      {/* Noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.35%22/></svg>')",
          backgroundSize: "220px 220px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-10 items-center relative z-10">
        {/* LEFT */}
        <div className="animate-fade-in text-center md:text-left">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display text-helo-dark leading-[1.05] tracking-tight mb-4">
            Beleza com <span className="text-helo-rose">delicadeza</span>.
          </h1>

          <p className="text-base md:text-lg text-helo-text/80 font-body max-w-lg mx-auto md:mx-0 leading-relaxed mb-6">
            Cosméticos desenvolvidos para realçar sua beleza
            com suavidade e elegância.
          </p>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <Link
              to="/produtos"
              className="group px-6 py-3 bg-helo-dark text-white font-semibold rounded-xl shadow-md transition-all hover:bg-helo-rose"
            >
              <span className="inline-flex items-center gap-2">
                Ver Produtos →
              </span>
            </Link>

            <a
              href={`https://wa.me/5562994445197?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="
                px-6
                py-3
                bg-helo-rose
                text-white
                font-semibold
                rounded-xl
                shadow-sm
                transition-all
                hover:bg-helo-light
                hover:text-helo-dark
              "
            >
              💬 Falar com a Helô
            </a>
          </div>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs text-helo-text/80 shadow-sm">
              🚚 Envio rápido
            </span>

            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs text-helo-text/80 shadow-sm">
              🔒 Compra segura
            </span>

            <span className="px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs text-helo-text/80 shadow-sm">
              💗 WhatsApp
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex justify-center animate-fade-in-delay">
          <div className="relative group">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-helo-rose/20 to-white/10 blur-[2px]" />

            <div className="
              relative
              w-52
              h-52
              md:w-64
              md:h-64
              lg:w-72
              lg:h-72
              rounded-full
              shadow-[0_12px_40px_rgba(0,0,0,0.12)]
              bg-white/70
              backdrop-blur-xl
              flex
              items-center
              justify-center
              border
              border-white/50
              overflow-hidden
            ">
              <motion.img
                src={logo}
                alt="Logo Helo Cosméticos"
                className="w-full h-full object-cover"
                initial={{ scale: 1.03 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
