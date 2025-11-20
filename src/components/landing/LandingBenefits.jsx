export default function LandingBenefits() {
  const benefits = [
    "Reduz volume e frizz rapidamente",
    "Sensação de fios mais leves e macios",
    "Brilho intenso e efeito alinhado",
    "Fórmula suave e não agressiva",
    "Ideal para rotina corrida",
  ];

  return (
    <section className="py-20 bg-white/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-center text-4xl font-display text-helo-dark mb-12">
          Benefícios do Kit Forte Liso
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl shadow-md border border-white/50 text-center"
            >
              <h3 className="font-display text-xl text-helo-dark mb-3">{b}</h3>
              <p className="text-helo-text/75 font-body">
                Resultado visível desde as primeiras aplicações.
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
