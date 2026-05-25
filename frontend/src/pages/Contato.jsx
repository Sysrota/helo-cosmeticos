import {
  ArrowRight,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { createElement } from "react";
import { Link } from "react-router-dom";
import logo from "/helo-logo.png";
import { buildWhatsAppUrl } from "../constants/store";

const whatsappHref = buildWhatsAppUrl(
  "Olá! Vim pela página de contato da Helô Cosméticos e preciso de atendimento."
);

const supportItems = [
  {
    icon: ShoppingBag,
    title: "Ajuda na compra",
    text: "Tire dúvidas sobre produtos e escolha o cuidado ideal para sua rotina.",
    message:
      "Olá! Vim pelo site e gostaria de ajuda para escolher um produto Helô.",
  },
  {
    icon: Truck,
    title: "Entrega e frete",
    text: "Consulte condições de frete e orientações para receber seu pedido.",
    message:
      "Olá! Gostaria de tirar uma dúvida sobre frete ou entrega do meu pedido.",
  },
  {
    icon: CreditCard,
    title: "Pagamento",
    text: "Receba suporte para concluir sua compra com PIX ou cartão.",
    message:
      "Olá! Preciso de ajuda para finalizar o pagamento da minha compra.",
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    text: "Compra segura pelo Mercado Pago",
  },
  {
    icon: Truck,
    text: "Frete grátis local ou R$ 25,00 OFF",
  },
  {
    icon: CreditCard,
    text: "10% OFF no PIX e 3x sem juros",
  },
];

export default function Contato() {
  return (
    <div className="min-h-screen bg-[#fff8fa]">
      <section className="relative overflow-hidden border-b border-[#f0e2e7] bg-white">
        <div className="absolute -left-20 top-12 h-64 w-64 rounded-full bg-[#fce8ed] blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#fff1f5] blur-3xl" />

        <div className="home-container relative grid gap-10 py-12 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:py-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74662]">
              <Sparkles size={14} />
              Atendimento Helô
            </p>
            <h1 className="mt-6 font-display text-4xl leading-tight text-[#43232d] sm:text-5xl">
              Fale com a gente
              <span className="block text-[#d9536f]">
                para cuidar da sua compra.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              Estamos disponíveis no WhatsApp para ajudar na escolha dos
              produtos, entrega ou pagamento da sua compra Helô Cosméticos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9536f] px-8 font-semibold text-white transition hover:bg-[#c84b67]"
              >
                <MessageCircle size={19} />
                Chamar no WhatsApp
              </a>
              <Link
                to="/acompanhar-pedido"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e6c8d0] bg-white px-7 font-semibold text-[#873c50] transition hover:border-[#d9536f]"
              >
                Acompanhar pedido
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#f0e2e7] bg-[#fffafb] p-6 shadow-[0_22px_62px_rgba(91,39,56,0.08)] sm:p-8">
            <div className="flex items-center gap-4 border-b border-[#f0e2e7] pb-6">
              <img
                src={logo}
                alt="Helô Cosméticos"
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <p className="font-display text-2xl text-[#43232d]">
                  Helô Cosméticos
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.17em] text-[#b74662]">
                  Canal de atendimento
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-zinc-600">
              Converse diretamente pelo WhatsApp para ter um atendimento
              próximo e receber orientação antes ou depois da compra.
            </p>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#fff1f5] font-semibold text-[#b74662] transition hover:bg-[#fbe6ec]"
            >
              <MessageCircle size={19} />
              Iniciar conversa
            </a>
          </div>
        </div>
      </section>

      <section className="home-container py-14 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b74662]">
            Como podemos ajudar
          </p>
          <h2 className="mt-4 font-display text-3xl text-[#43232d] sm:text-4xl">
            Atendimento para cada etapa
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {supportItems.map(({ icon, title, text, message }) => (
            <article
              key={title}
              className="flex flex-col rounded-3xl border border-[#f0e2e7] bg-white p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f4] text-[#d9536f]">
                {createElement(icon, { size: 22 })}
              </span>
              <h3 className="mt-5 font-display text-2xl text-[#43232d]">
                {title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-zinc-600">
                {text}
              </p>
              <a
                href={buildWhatsAppUrl(message)}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#b74662] transition hover:text-[#d9536f]"
              >
                Falar sobre isso
                <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#f0e2e7] bg-white">
        <div className="home-container grid gap-6 py-10 sm:grid-cols-3 lg:py-12">
          {benefits.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1f5] text-[#d9536f]">
                {createElement(icon, { size: 20 })}
              </span>
              <p className="text-sm font-medium leading-6 text-[#43232d]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-container py-14 text-center lg:py-16">
        <h2 className="font-display text-3xl text-[#43232d]">
          Prefere escolher primeiro?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-zinc-600">
          Conheça os produtos Helô e chame nosso atendimento quando precisar
          de ajuda para finalizar sua compra.
        </p>
        <Link
          to="/produtos"
          className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d9536f] px-9 font-semibold text-white transition hover:bg-[#c84b67]"
        >
          Ver produtos
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
