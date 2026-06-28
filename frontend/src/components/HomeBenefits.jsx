import { createElement } from "react";
import { CreditCard, ShieldCheck, Tag, Truck } from "lucide-react";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

export default function HomeBenefits() {
  const {
    pixEnabled,
    creditCardEnabled,
    pix_discount_percent: pixDiscountPercent,
    pixLabel,
    card_interest_free_installments: interestFreeInstallments,
    card_max_installments: maxInstallments,
    freeShippingLabel,
    show_secure_purchase: showSecurePurchase,
  } = useCommercialPolicy();
  const hasPixDiscount =
    pixEnabled && Number(pixDiscountPercent) > 0;
  const benefits = [
    hasPixDiscount && {
      icon: Tag,
      title: pixLabel,
      text: "Economia aplicada na finalização.",
    },
    creditCardEnabled && {
      icon: CreditCard,
      title: `${interestFreeInstallments}x sem juros`,
      text: `Ou até ${maxInstallments}x com juros no cartão.`,
    },
    {
      icon: Truck,
      title: freeShippingLabel,
      text: "Condição válida nas opções de entrega elegíveis.",
    },
    showSecurePurchase && {
      icon: ShieldCheck,
      title: "Compra protegida",
      text: "Pagamento via Mercado Pago.",
    },
  ].filter(Boolean);
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
