const before = "https://placehold.co/600x800/d9d9d9/000?text=Antes&font=Playfair+Display";
const after = "https://placehold.co/600x800/f6e6e9/d9536f?text=Depois&font=Playfair+Display";

export default function LandingBeforeAfter() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 text-center">

        <h2 className="text-4xl font-display text-helo-dark mb-14">
          Antes e Depois
        </h2>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img src={before} className="w-full h-full object-cover" />
          </div>

          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img src={after} className="w-full h-full object-cover" />
          </div>
        </div>

      </div>
    </section>
  );
}
