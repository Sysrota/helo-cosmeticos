export default function LandingTestimonials() {
  const depoimentos = [
    {
      name: "Mariana S.",
      text: "Nunca senti meu cabelo tão leve e alinhado! Sem contar o brilho incrível.",
    },
    {
      name: "Julia M.",
      text: "Uso toda semana. O efeito é imediato e sem agredir meu cabelo.",
    },
    {
      name: "Beatriz R.",
      text: "Perfeito para quem tem a rotina corrida. Resultado rápido!",
    },
  ];

  return (
    <section className="py-20 bg-helo-background">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-4xl font-display text-helo-dark text-center mb-12">
          O que as clientes dizem
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {depoimentos.map((d, i) => (
            <div key={i} className="bg-white/80 p-8 rounded-2xl shadow-md text-center">
              <p className="text-helo-text/90 font-body text-lg italic">{d.text}</p>
              <h4 className="font-display text-helo-dark mt-4">{d.name}</h4>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
