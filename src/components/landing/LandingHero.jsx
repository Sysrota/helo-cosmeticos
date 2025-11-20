import logo from "/helo-logo.png";
const placeholder =
  "https://placehold.co/600x800/F6E6E9/D9536F?text=Kit+Forte+Liso&font=Playfair+Display";

export default function LandingHero() {
  return (
    <section className="relative py-24 md:py-32 bg-helo-light overflow-hidden">

      <div className="absolute top-0 right-0 w-96 h-96 bg-helo-rose/40 blur-[120px] opacity-40"></div>

      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center z-10 relative">

        {/* Left - Text */}
        <div>
          <img src={logo} className="w-40 mb-8 opacity-90" />

          <h1 className="text-4xl md:text-5xl font-display text-helo-dark leading-tight">
            <span className="block">Kit Forte Liso</span>
            <span className="block text-helo-rose">cabelos alinhados, leves</span>
            <span className="block text-helo-dark">e com brilho intenso.</span>
          </h1>

          <p className="mt-6 text-lg text-helo-text/90 max-w-md font-body">
            Uma rotina prática e eficiente para transformar seus fios com maciez,
            disciplina e brilho — sem agressão e sem complicação.
          </p>

          <div className="mt-10 flex gap-4 flex-wrap">
            <a
              href="/produto/1"
              className="px-8 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold hover:bg-helo-rose transition-all shadow-md hover:shadow-xl"
            >
              Comprar agora
            </a>

            <a
              href="https://wa.me/55XXXXXXXXXX"
              className="px-8 py-4 border border-helo-dark text-helo-dark rounded-xl font-semibold hover:bg-helo-dark hover:text-white transition-all text-lg shadow-sm"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* Right - Image */}
        <div className="flex justify-center">
          <div className="w-80 h-96 md:w-96 md:h-[460px] rounded-3xl overflow-hidden shadow-xl">
            <img src={placeholder} className="w-full h-full object-cover" />
          </div>
        </div>

      </div>
    </section>
  );
}
