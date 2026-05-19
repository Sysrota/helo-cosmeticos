import logo from "/helo-logo.png";

export default function Sobre() {
  return (
    <div className="bg-helo-background min-h-screen py-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* TÍTULO PRINCIPAL */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display text-helo-dark leading-tight animate-fade-in">
            A história por trás da Helô Cosméticos
          </h1>

          <p className="mt-4 text-helo-text/80 max-w-2xl mx-auto font-body text-lg animate-fade-in-delay">
            Uma marca criada com significado, carinho e um toque de delicadeza que nasce do amor.
          </p>
        </div>

        {/* BLOCO 1 — A HOMENAGEM */}
        <section className="grid md:grid-cols-2 gap-14 mb-24 items-center">

          {/* Logo */}
          <div className="rounded-2xl shadow-xl bg-white/60 backdrop-blur-xl p-6 border border-white/40 flex justify-center animate-fade-in">
            <img
              src={logo}
              alt="Helô Cosméticos"
              className="object-contain w-56 h-56 md:w-72 md:h-72"
            />
          </div>

          {/* Texto */}
          <div className="animate-fade-in-delay">
            <h2 className="text-3xl font-display text-helo-dark mb-4">
              Inspirada em quem ilumina nossos dias
            </h2>

            <p className="text-helo-text/90 font-body text-lg leading-relaxed">
              A Helô Cosméticos nasceu como uma homenagem à nossa filha, Heloísa — uma luz constante,
              cheia de vida e delicadeza.  
              Seu nome carrega significado, beleza e amor — valores que se tornaram a base da marca.
            </p>

            <p className="text-helo-text/90 font-body text-lg leading-relaxed mt-4">
              Cada produto é pensado para transmitir exatamente isso: cuidado de verdade,
              carinho nos detalhes e uma experiência leve e prazerosa para todas as mulheres.
            </p>
          </div>

        </section>

        {/* BLOCO 2 — PROPÓSITO */}
        <section className="mb-24 text-center animate-fade-in">
          <h2 className="text-3xl font-display text-helo-dark mb-6">
            Nosso Propósito
          </h2>

          <p className="text-helo-text/90 font-body text-lg leading-relaxed max-w-3xl mx-auto">
            Criamos cosméticos que valorizam a beleza real — aquela que vem da autoestima, do carinho
            próprio e da leveza do dia a dia.  
            Cada fórmula, cada textura e cada aroma é desenvolvido para proporcionar bem-estar e confiança.
          </p>
        </section>

        {/* BLOCO 3 — VALORES (com ícones premium) */}
        <section className="grid md:grid-cols-3 gap-10 mb-24">

          <div className="bg-white/70 p-8 rounded-2xl shadow-lg backdrop-blur-xl border border-white/40 text-center animate-fade-in">
            <div className="text-helo-dark text-5xl mb-4">💗</div>
            <h3 className="font-display text-xl text-helo-dark mb-3">Delicadeza</h3>
            <p className="font-body text-helo-text/80">
              Desde o desenvolvimento até a entrega, cuidamos de cada detalhe com carinho.
            </p>
          </div>

          <div className="bg-white/70 p-8 rounded-2xl shadow-lg backdrop-blur-xl border border-white/40 text-center animate-fade-in-delay">
            <div className="text-helo-dark text-5xl mb-4">✨</div>
            <h3 className="font-display text-xl text-helo-dark mb-3">Qualidade</h3>
            <p className="font-body text-helo-text/80">
              Trabalhamos com foco em resultados reais, mantendo suavidade e elegância.
            </p>
          </div>

          <div className="bg-white/70 p-8 rounded-2xl shadow-lg backdrop-blur-xl border border-white/40 text-center animate-fade-in">
            <div className="text-helo-dark text-5xl mb-4">🌸</div>
            <h3 className="font-display text-xl text-helo-dark mb-3">Autenticidade</h3>
            <p className="font-body text-helo-text/80">
              Uma marca com alma, essência própria e identidade feminina verdadeira.
            </p>
          </div>

        </section>

        {/* BLOCO 4 — CHAMADA FINAL */}
        <section className="text-center animate-fade-in">
          <h2 className="text-3xl font-display text-helo-dark mb-6">
            A beleza que nasce do carinho
          </h2>

          <p className="text-helo-text/90 font-body text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            A Helô Cosméticos é para mulheres que buscam cuidado diário com leveza,
            qualidade e um toque especial.  
            Tudo que fazemos carrega a mesma sensibilidade que inspirou o nome da marca.
          </p>

          <a
            href="/produtos"
            className="px-10 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold shadow-md hover:bg-helo-rose transition-all hover:shadow-xl"
          >
            Conhecer Produtos
          </a>
        </section>

      </div>
    </div>
  );
}
