import { createElement } from "react";
import { CreditCard, ShieldCheck, Tag, Truck } from "lucide-react";

const benefits = [
  {
    icon: Tag,
    title: "10% OFF no PIX",
    text: "Economia aplicada na finalização.",
  },
  {
    icon: CreditCard,
    title: "3x sem juros",
    text: "Ou até 12x com juros no cartão.",
  },
  {
    icon: Truck,
    title: "Frete grátis local",
    text: "R$ 25,00 OFF nas demais localizações.",
  },
  {
    icon: ShieldCheck,
    title: "Compra protegida",
    text: "Pagamento via Mercado Pago.",
  },
];

export default function HomeBenefits() {
  return (
    <section className="home-benefits bg-white">
      <div className="home-container grid gap-px overflow-hidden rounded-[1.5rem] border border-[#f0e2e7] bg-[#f0e2e7] sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map(({ icon, title, text }) => (
          <article key={title} className="flex gap-4 bg-white px-5 py-5 lg:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff1f5] text-[#d9536f]">
              {createElement(icon, { size: 21 })}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#43232d]">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
