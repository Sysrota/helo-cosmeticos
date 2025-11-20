import ProductCard from "./ProductCard";

const placeholder = "https://placehold.co/600x800/F6E6E9/D9536F?text=Produto&font=Playfair+Display";

export default function ProductsSection() {
  return (
    <section className="py-20 bg-helo-background">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-14">
          <h2 className="text-4xl font-display text-helo-dark">
            Nossos Produtos
          </h2>
          <p className="text-helo-text/80 mt-4 max-w-xl mx-auto">
            Linha criada com delicadeza, cuidado e qualidade para sua beleza diária.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <ProductCard image={placeholder} title="Produto 1" price="R$ 49,90" />
          <ProductCard image={placeholder} title="Produto 2" price="R$ 59,90" />
          <ProductCard image={placeholder} title="Produto 3" price="R$ 39,90" />
        </div>

      </div>
    </section>
  );
}
