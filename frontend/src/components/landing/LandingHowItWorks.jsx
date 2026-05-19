export default function LandingHowItWorks() {
  const steps = [
    {
      title: "1. Shampoo Anti-Resíduo",
      text: "Prepara os fios para receber os ativos, removendo impurezas.",
    },
    {
      title: "2. Redutor de Volume",
      text: "Age diretamente na fibra para alinhar e suavizar os fios.",
    },
    {
      title: "3. Finalizador",
      text: "Garante brilho, leveza e proteção no dia a dia.",
    },
  ];

  return (
    <section className="py-20 bg-helo-background">
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-center text-4xl font-display text-helo-dark mb-14">
          Como o Kit Forte Liso funciona?
        </h2>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((s, i) => (
            <div key={i} className="text-center bg-white/70 p-8 rounded-2xl shadow-md">
              <h3 className="font-display text-2xl text-helo-dark mb-3">{s.title}</h3>
              <p className="text-helo-text/80 font-body">{s.text}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
