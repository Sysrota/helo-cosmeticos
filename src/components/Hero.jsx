import logo from "/helo-logo.png";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-helo-light to-helo-background pt-24 md:pt-32 pb-20">

      {/* Brilho Rosé Premium no Fundo */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-helo-rose/30 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-120px] right-[-120px] w-[380px] h-[380px] bg-helo-rose/40 rounded-full blur-[140px] opacity-70"></div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center relative z-10">

        {/* LEFT — TEXT */}
        <div className="animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display text-helo-dark leading-tight mb-6">
            Beleza com
            <span className="text-helo-rose"> delicadeza</span>.
          </h1>

          <p className="text-lg md:text-xl text-helo-text/90 font-body max-w-md leading-relaxed mb-10">
            Cosméticos desenvolvidos com carinho, criados para realçar sua beleza
            com leveza, suavidade e um toque especial.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="/produtos"
              className="px-8 py-4 bg-helo-rose text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-helo-dark transition-all"
            >
              Ver Produtos
            </a>

            <a
              href="https://wa.me/556298228-7272"
              className="px-8 py-4 border border-helo-rose text-helo-rose font-semibold rounded-xl hover:bg-helo-rose hover:text-white transition-all shadow-md"
            >
              Falar com a Helô
            </a>
          </div>
        </div>

        {/* RIGHT — LOGO PREMIUM */}
        <div className="flex justify-center animate-fade-in-delay">
          <div className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] bg-white/70 backdrop-blur-xl flex items-center justify-center border border-white/40 overflow-hidden">
            <img
              src={logo}
              alt="Helô Cosméticos"
              className="w-full h-full object-contain scale-[1.15]"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
