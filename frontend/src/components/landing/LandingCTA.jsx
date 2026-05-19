export default function LandingCTA() {
  return (
    <section className="py-24 bg-helo-dark text-white text-center">
      <h2 className="text-4xl font-display mb-6">
        Pronta para transformar seu cabelo?
      </h2>

      <p className="text-lg font-body mb-10 opacity-90">
        Seu novo brilho, leveza e alinhamento começam aqui.
      </p>

      <a
        href="/produto/1"
        className="px-10 py-4 bg-white text-helo-dark rounded-xl text-xl font-semibold shadow-lg hover:bg-helo-rose hover:text-white transition-all"
      >
        Comprar Agora
      </a>
    </section>
  );
}
