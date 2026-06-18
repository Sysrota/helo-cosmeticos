import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { OrderCreditCardCard } from "../components/orders/OrderCreditCardCard";
import { OrderPixCard } from "../components/orders/OrderPixCard";
import UpsellProducts from "../components/UpsellProducts";
import ProductImagePreview from "../components/ProductImagePreview";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import Formatter from "../utils/Formatter";
import { socket } from "../websocket/socket";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

const steps = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pagamento" },
];

const emptyCustomer = {
  email: "",
  name: "",
  phone: "",
  cpf: "",
  zipcode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatShippingPrice(value) {
  return Number(value) === 0
    ? "Grátis"
    : formatMoney(value);
}

function formatShippingOptionPrice(option) {
  if (
    String(option?.name || "").startsWith("Moto Uber") &&
    Number(option?.price || 0) === 0
  ) {
    return "Pago ao entregador";
  }

  return formatShippingPrice(
    option?.price ?? 0
  );
}

function getCheckoutImageUrl(item) {
  const image =
    item.product?.images?.[0]?.image_url ||
    item.product?.image_url ||
    "";
  const apiBase =
    API_URL.replace(/\/$/, "");

  if (!image) {
    return "";
  }

  if (
    image.startsWith("http") ||
    image.startsWith("data:") ||
    image === apiBase ||
    image.startsWith(`${apiBase}/`)
  ) {
    return image;
  }

  return `${apiBase}${image.startsWith("/") ? "" : "/"}${image}`;
}

function itemProductId(item) {
  return item.product_id ?? item.id;
}

function mergeCartItems(items) {
  return items.reduce((combined, item) => {
    const existingIndex = combined.findIndex(
      (currentItem) =>
        itemProductId(currentItem) ===
        itemProductId(item)
    );

    if (existingIndex < 0) {
      return [
        ...combined,
        {
          ...item,
          quantity: Number(item.quantity || 1),
        },
      ];
    }

    return combined.map((currentItem, index) =>
      index === existingIndex
        ? {
          ...currentItem,
          quantity:
            Number(currentItem.quantity || 1) +
            Number(item.quantity || 1),
        }
        : currentItem
    );
  }, []);
}

function InputField({
  className = "",
  error,
  label,
  ...props
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[13px] font-medium text-zinc-700">
        {label}
      </span>
      <input
        {...props}
        className={`
          h-14 w-full rounded-2xl border bg-white px-4 text-sm text-zinc-900
          outline-none transition
          ${error
            ? "border-red-300 ring-2 ring-red-50"
            : "border-[#eadfe3] focus:border-[#d85c7a] focus:ring-4 focus:ring-[#fbe9ee]"}
        `}
      />
      {error && (
        <span className="mt-1.5 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

export default function PublicCheckoutPage() {
  const {
    pix_discount_percent: pixDiscountPercent,
    cardLabel,
    freeShippingLabel,
    card_max_installments: maxInstallments,
  } = useCommercialPolicy();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    cart,
    clearCart,
    addToCart,
    removeFromCart,
    setCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();
  const directPurchaseItem =
    location.state?.directPurchaseItem || null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("pix");
  const [pixData, setPixData] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [directPurchaseCart, setDirectPurchaseCart] = useState(() =>
    directPurchaseItem
      ? mergeCartItems([directPurchaseItem, ...cart])
      : []
  );
  const addressRequestRef = useRef(0);

  useEffect(() => {
    if (
      !id &&
      !cart.length &&
      !directPurchaseItem &&
      !order &&
      !saving
    ) {
      navigate("/carrinho", { replace: true });
      return;
    }

    if (!id) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadOrder() {
      try {
        const { data } = await api.get(`/orders/${id}`);

        if (!active) {
          return;
        }

        const savedAddress =
          data.contact?.addresses?.[0];

        setOrder(data);
        setCustomer((previous) => ({
          ...previous,
          name: data.contact?.name || previous.name,
          email: data.contact?.email || previous.email,
          phone: data.contact?.phone || previous.phone,
          cpf: data.contact?.cpf || previous.cpf,
          zipcode: savedAddress?.cep || previous.zipcode,
          street: savedAddress?.street || previous.street,
          number: savedAddress?.number || previous.number,
          district: savedAddress?.district || previous.district,
          city: savedAddress?.city || previous.city,
          state: savedAddress?.state || previous.state,
        }));
      } catch {
        if (active) {
          setNotice("Não foi possível carregar este pedido.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [
    cart.length,
    directPurchaseItem,
    id,
    navigate,
    order,
    saving,
  ]);

  useEffect(() => {
    if (!id) {
      return undefined;
    }

    function handleOrderUpdated(updatedOrder) {
      if (updatedOrder.id !== Number(id)) {
        return;
      }

      setOrder(updatedOrder);

      if (
        updatedOrder.payment_status === "approved" ||
        updatedOrder.payment_status === "paid"
      ) {
        setPaymentApproved(true);
      }
    }

    socket.on("order_updated", handleOrderUpdated);

    return () => {
      socket.off("order_updated", handleOrderUpdated);
    };
  }, [id]);

  const checkoutCart = useMemo(
    () => directPurchaseItem
      ? directPurchaseCart
      : cart,
    [cart, directPurchaseCart, directPurchaseItem]
  );

  const checkoutItems = useMemo(() => {
    if (order?.items) {
      return order.items;
    }

    return checkoutCart.map((item) => ({
      quantity: item.quantity || 1,
      unit_price: item.price,
      product: {
        title: item.title,
        subtitle: item.subtitle || "",
        images: item.image ? [{ image_url: item.image }] : [],
      },
    }));
  }, [checkoutCart, order]);

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (value, item) =>
          value + Number(item.unit_price) * Number(item.quantity || 1),
        0
      ),
    [checkoutItems]
  );

  const shippingPrice = Number(
    selectedShipping?.price ??
    order?.shipping ??
    0
  );
  const total = subtotal + shippingPrice;
  const pixDiscount =
    step === 3 &&
    selectedPaymentMethod === "pix"
      ? Number((total * (pixDiscountPercent / 100)).toFixed(2))
      : 0;
  const paymentTotal =
    Number(
      (
        total -
        pixDiscount
      ).toFixed(2)
    );

  function updateCustomer(field, value) {
    setCustomer((previous) => ({
      ...previous,
      [field]: value,
    }));
    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
    setNotice("");
  }

  function addCheckoutExtra(item) {
    if (
      directPurchaseItem
    ) {
      setDirectPurchaseCart(
        (previous) =>
          mergeCartItems([
            ...previous,
            item,
          ])
      );
    }

    addToCart(
      item
    );
  }

  function removeCheckoutItem(index) {
    if (directPurchaseItem) {
      const item = checkoutCart[index];
      const removedProductId = itemProductId(item);

      setDirectPurchaseCart((previous) =>
        previous.filter((_, itemIndex) => itemIndex !== index)
      );
      setCart((previous) =>
        previous.filter(
          (cartItem) =>
            itemProductId(cartItem) !== removedProductId
        )
      );

      if (checkoutCart.length === 1) {
        navigate("/carrinho", { replace: true });
      }

      return;
    }

    removeFromCart(index);
  }

  function updateCheckoutQuantity(index, change) {
    if (directPurchaseItem) {
      setDirectPurchaseCart((previous) =>
        previous.map((item, itemIndex) =>
          itemIndex === index
            ? {
              ...item,
              quantity: Math.max(
                1,
                Number(item.quantity || 1) + change
              ),
            }
            : item
        )
      );
      return;
    }

    if (change > 0) {
      increaseQuantity(index);
      return;
    }

    decreaseQuantity(index);
  }

  function validatePersonalData() {
    const nextErrors = {};

    if (!customer.name.trim()) {
      nextErrors.name = "Informe seu nome completo.";
    }
    if (!/\S+@\S+\.\S+/.test(customer.email)) {
      nextErrors.email = "Informe um e-mail válido.";
    }
    if (Formatter.onlyNumbers(customer.phone).length < 10) {
      nextErrors.phone = "Informe um celular válido.";
    }
    if (Formatter.onlyNumbers(customer.cpf).length !== 11) {
      nextErrors.cpf = "Informe os 11 digitos do CPF.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAddress() {
    const nextErrors = {};

    if (Formatter.onlyNumbers(customer.zipcode).length !== 8) {
      nextErrors.zipcode = "Informe um CEP válido.";
    }
    if (!customer.street.trim()) {
      nextErrors.street = "Informe o endereço.";
    }
    if (!customer.number.trim()) {
      nextErrors.number = "Informe o número.";
    }
    if (!customer.district.trim()) {
      nextErrors.district = "Informe o bairro.";
    }
    if (!customer.city.trim()) {
      nextErrors.city = "Informe a cidade.";
    }
    if (!customer.state.trim()) {
      nextErrors.state = "Informe a UF.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function loadAddressByZipcode(zipcode, requestId) {
    try {
      setLoadingAddress(true);
      const { data } = await api.get(
        `/shipping/address/${Formatter.onlyNumbers(zipcode)}`
      );

      if (addressRequestRef.current !== requestId) {
        return;
      }

      setCustomer((previous) => ({
        ...previous,
        zipcode: data.zipcode || previous.zipcode,
        street: data.street || "",
        district: data.district || "",
        city: data.city || "",
        state: data.state || "",
      }));
      setErrors((previous) => ({
        ...previous,
        zipcode: "",
        street: "",
        district: "",
        city: "",
        state: "",
      }));
    } catch {
      if (addressRequestRef.current === requestId) {
        setErrors((previous) => ({
          ...previous,
          zipcode: "CEP não encontrado.",
        }));
      }
    } finally {
      if (addressRequestRef.current === requestId) {
        setLoadingAddress(false);
      }
    }
  }

  function handleZipcodeChange(value) {
    const zipcode = Formatter.cep(
      Formatter.onlyNumbers(value).slice(0, 8)
    );
    const requestId = addressRequestRef.current + 1;

    addressRequestRef.current = requestId;
    setShippingOptions([]);
    setSelectedShipping(null);
    setCustomer((previous) => ({
      ...previous,
      zipcode,
      street: "",
      district: "",
      city: "",
      state: "",
    }));
    setErrors((previous) => ({
      ...previous,
      zipcode: "",
      street: "",
      district: "",
      city: "",
      state: "",
    }));

    if (Formatter.onlyNumbers(zipcode).length === 8) {
      loadAddressByZipcode(zipcode, requestId);
    } else {
      setLoadingAddress(false);
    }
  }

  async function createOrderFromCart() {
    const { data } = await api.post("/checkout", {
      customer,
      cart: checkoutCart,
    });

    setOrder(data);

    clearCart();

    navigate(`/checkout/${data.id}`, { replace: true });
    return data;
  }

  async function continueFromPersonalData() {
    if (!validatePersonalData()) {
      setNotice("Revise os dados indicados para continuar.");
      return;
    }

    try {
      setSaving(true);

      if (!order) {
        await createOrderFromCart();
      }

      setNotice("");
      setStep(2);
    } catch {
      setNotice("Não foi possível iniciar seu pedido. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function calculateShipping() {
    if (!validateAddress() || !order) {
      setNotice("Preencha o endereço completo para consultar a entrega.");
      return;
    }

    try {
      setLoadingShipping(true);
      setNotice("");
      const { data } = await api.post("/shipping/calculate", {
        cep: customer.zipcode,
        order_id: order.id,
      });

      setShippingOptions(data);
      setSelectedShipping(
        data.reduce(
          (bestOption, option) =>
            !bestOption ||
            Number(option.price) <
              Number(bestOption.price)
              ? option
              : bestOption,
          null
        )
      );
    } catch {
      setNotice("Não foi possível calcular a entrega para este CEP.");
    } finally {
      setLoadingShipping(false);
    }
  }

  async function continueFromDelivery() {
    if (!selectedShipping) {
      setNotice("Selecione uma opção de entrega para continuar.");
      return;
    }

    try {
      setSaving(true);
      setNotice("");
      const { data } = await api.put(`/checkout/${order.id}/delivery`, {
        customer,
        shipping_method: selectedShipping.name,
      });

      setOrder(data);
      setStep(3);
    } catch {
      setNotice("Não foi possível salvar a entrega. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function generatePix() {
    try {
      setLoadingPix(true);
      setNotice("");
      const { data } = await api.post("/payment/pix", {
        order_id: order.id,
      });
      setPixData(data);
    } catch {
      setNotice("Não foi possível gerar o PIX.");
    } finally {
      setLoadingPix(false);
    }
  }

  function previousStep() {
    setNotice("");
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  if (loading || (!order && id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf8f8]">
        <p className="text-sm text-zinc-500">Carregando checkout seguro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8f8] text-zinc-900">
      <header className="border-b border-[#eee2e6] bg-white">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d85c7a] text-white">
              <Sparkles size={17} />
            </div>
            <div>
              <p className="font-display text-xl text-[#713a49]">
                Helô Cosméticos
              </p>
              <p className="text-xs text-zinc-500">Checkout seguro</p>
            </div>
          </Link>
          <div className="hidden items-center gap-5 text-xs text-zinc-500 sm:flex">
            <Link to="/carrinho" className="flex items-center gap-1.5 hover:text-[#d85c7a]">
              <ArrowLeft size={14} />
              Voltar ao carrinho
            </Link>
            <span className="h-4 w-px bg-[#eee2e6]" />
            <span className="flex items-center gap-1.5">
              <Lock size={14} className="text-[#d85c7a]" />
              Ambiente protegido
            </span>
          </div>
        </div>
      </header>

      {paymentApproved && (
        <div className="mx-auto mt-6 max-w-[1200px] px-5 lg:px-8">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 size={20} />
            <div>
              <p className="text-sm font-semibold">Pagamento aprovado</p>
              <p className="text-xs">Seu pedido foi confirmado com sucesso.</p>
              <Link
                to="/acompanhar-pedido"
                state={{
                  orderId:
                    order?.id,
                  email:
                    customer.email,
                }}
                className="mt-2 inline-block text-xs font-semibold underline"
              >
                Acompanhar meu pedido
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1200px] px-5 py-6 lg:px-8 lg:py-10">
        <button
          onClick={() => setResumeOpen((open) => !open)}
          className="mb-5 flex w-full items-center justify-between rounded-2xl border border-[#eee2e6] bg-white p-4 lg:hidden"
        >
          <span className="text-left">
            <span className="block text-xs text-zinc-500">Resumo do pedido</span>
            <span className="mt-1 block text-xl font-semibold">{formatMoney(paymentTotal)}</span>
          </span>
          <ChevronDown
            size={18}
            className={`transition-transform ${resumeOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="rounded-[28px] border border-[#eee2e6] bg-white p-5 shadow-[0_12px_40px_rgba(68,31,42,0.04)] sm:p-8 lg:p-10">
            <div className="mb-9 flex items-center justify-between gap-2">
              {steps.map((item, index) => {
                const active = step >= item.id;
                const current = step === item.id;

                return (
                  <div key={item.id} className="flex flex-1 items-center last:flex-none">
                    <div className="flex items-center gap-2.5">
                      <span className={`
                        flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold
                        ${active ? "bg-[#d85c7a] text-white" : "bg-[#f5eff1] text-zinc-400"}
                      `}>
                        {step > item.id ? <Check size={16} /> : item.id}
                      </span>
                      <span className={`hidden text-sm sm:block ${current ? "font-semibold text-zinc-900" : "text-zinc-500"}`}>
                        {item.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <span className={`mx-3 h-px flex-1 ${step > item.id ? "bg-[#d85c7a]" : "bg-[#eee2e6]"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {notice && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {notice}
              </div>
            )}

            {step === 1 && (
              <>
                <h1 className="font-display text-3xl text-[#43232d]">
                  Seus dados
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Precisamos destas informações para preparar sua entrega.
                </p>
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <InputField
                    className="sm:col-span-2"
                    label="Nome completo"
                    value={customer.name}
                    error={errors.name}
                    onChange={(event) => updateCustomer("name", event.target.value)}
                  />
                  <InputField
                    className="sm:col-span-2"
                    label="E-mail"
                    type="email"
                    value={customer.email}
                    error={errors.email}
                    onChange={(event) => updateCustomer("email", event.target.value)}
                  />
                  <InputField
                    label="Celular"
                    value={Formatter.telefone(customer.phone)}
                    error={errors.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                  />
                  <InputField
                    label="CPF"
                    value={Formatter.cpfCnpj(customer.cpf)}
                    error={errors.cpf}
                    onChange={(event) => updateCustomer("cpf", event.target.value)}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl text-[#43232d]">
                      Entrega
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">
                      Informe o CEP e escolha a melhor forma de receber.
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#b74662]">
                      {freeShippingLabel} nas opções elegíveis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={previousStep}
                    className="text-sm text-zinc-500 transition hover:text-[#d85c7a]"
                  >
                    Voltar
                  </button>
                </div>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  <InputField
                    className="sm:col-span-2"
                    label="CEP"
                    value={Formatter.cep(customer.zipcode)}
                    error={errors.zipcode}
                    onChange={(event) => handleZipcodeChange(event.target.value)}
                  />
                  {loadingAddress && (
                    <p className="-mt-3 text-xs text-[#d85c7a] sm:col-span-2">
                      Buscando endereço...
                    </p>
                  )}
                  <InputField
                    className="sm:col-span-2"
                    label="Rua"
                    value={customer.street}
                    error={errors.street}
                    onChange={(event) => updateCustomer("street", event.target.value)}
                  />
                  <InputField
                    label="Número"
                    value={customer.number}
                    error={errors.number}
                    onChange={(event) => updateCustomer("number", event.target.value)}
                  />
                  <InputField
                    label="Complemento (opcional)"
                    value={customer.complement}
                    onChange={(event) => updateCustomer("complement", event.target.value)}
                  />
                  <InputField
                    className="sm:col-span-2"
                    label="Bairro"
                    value={customer.district}
                    error={errors.district}
                    onChange={(event) => updateCustomer("district", event.target.value)}
                  />
                  <InputField
                    label="Cidade"
                    value={customer.city}
                    error={errors.city}
                    onChange={(event) => updateCustomer("city", event.target.value)}
                  />
                  <InputField
                    label="UF"
                    value={customer.state}
                    error={errors.state}
                    onChange={(event) => updateCustomer("state", event.target.value.toUpperCase().slice(0, 2))}
                  />
                </div>

                {shippingOptions.length > 0 && (
                  <div className="mt-8">
                    <p className="mb-3 text-sm font-semibold text-zinc-900">
                      Opções de entrega
                    </p>
                    <div className="space-y-3">
                      {shippingOptions.map((option) => {
                        const selected = selectedShipping?.name === option.name;

                        return (
                          <button
                            key={`${option.name}-${option.price}`}
                            type="button"
                            onClick={() => {
                              setSelectedShipping(option);
                              setNotice("");
                            }}
                            className={`
                              flex w-full items-center justify-between rounded-2xl border p-4 text-left transition
                              ${selected
                                ? "border-[#d85c7a] bg-[#fff5f7]"
                                : "border-[#eee2e6] bg-white hover:border-[#e7bdc8]"}
                            `}
                          >
                            <span className="flex items-center gap-3">
                              <span className={`
                                flex h-5 w-5 items-center justify-center rounded-full border
                                ${selected ? "border-[#d85c7a]" : "border-zinc-300"}
                              `}>
                                {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#d85c7a]" />}
                              </span>
                              <span>
                                <span className="block text-sm font-semibold text-zinc-900">
                                  {option.name}
                                </span>
                                <span className="block text-xs text-zinc-500">
                                  {option.deadline}
                                </span>
                                {Number(option.discount || 0) > 0 && (
                                  <span className="mt-1 block text-xs font-medium text-emerald-700">
                                    Frete grátis aplicado pela condição da compra
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className="text-right">
                              {Number(option.original_price) > Number(option.price) && (
                                <span className="block text-xs text-zinc-400 line-through">
                                  {formatMoney(option.original_price)}
                                </span>
                              )}
                              <span className="block text-sm font-semibold text-[#b74662]">
                                {formatShippingOptionPrice(option)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl text-[#43232d]">
                      Pagamento
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">
                      Escolha a forma de pagamento mais conveniente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={previousStep}
                    className="text-sm text-zinc-500 transition hover:text-[#d85c7a]"
                  >
                    Voltar
                  </button>
                </div>

                <div className="mt-7 rounded-2xl border border-[#eee2e6] bg-[#fcf9fa] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-semibold">{selectedShipping?.name}</span>
                      <span className="block text-xs text-zinc-500">{selectedShipping?.deadline}</span>
                    </span>
                    <span className="text-right">
                      {Number(selectedShipping?.original_price) > Number(selectedShipping?.price) && (
                        <span className="block text-xs text-zinc-400 line-through">
                          {formatMoney(selectedShipping.original_price)}
                        </span>
                      )}
                      <span className="block text-sm font-semibold text-[#b74662]">
                        {formatShippingOptionPrice(selectedShipping)}
                      </span>
                    </span>
                  </div>
                  {Number(selectedShipping?.discount || 0) > 0 && (
                    <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Frete grátis aplicado: sua compra atende à condição de {freeShippingLabel.toLowerCase()}.
                    </p>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("pix")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedPaymentMethod === "pix"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <Sparkles size={17} className="mb-3 text-[#d85c7a]" />
                    <p className="text-sm font-semibold">PIX</p>
                    <p className="mt-1 text-xs text-zinc-500">Desconto exclusivo no PIX</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("credit_card")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedPaymentMethod === "credit_card"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <CreditCard size={17} className="mb-3 text-[#d85c7a]" />
                    <p className="text-sm font-semibold">Cartão</p>
                    <p className="mt-1 text-xs text-zinc-500">{cardLabel}</p>
                  </button>
                </div>

                <div className="mt-6">
                  {selectedPaymentMethod === "pix" && (
                    <OrderPixCard
                      generatePix={generatePix}
                      loadingPix={loadingPix}
                      pixData={pixData}
                      order={order}
                      pixDiscount={pixDiscount}
                      pixTotal={paymentTotal}
                      pixDiscountPercent={pixDiscountPercent}
                    />
                  )}
                  {selectedPaymentMethod === "credit_card" && (
                    <OrderCreditCardCard
                      order={order}
                      maxInstallments={maxInstallments}
                      initialCustomer={customer}
                    />
                  )}
                </div>
              </>
            )}

            {step < 3 && (
              <div className="mt-8">
                {step === 1 && (
                  <button
                    type="button"
                    onClick={continueFromPersonalData}
                    disabled={saving}
                    className="h-14 w-full rounded-2xl bg-[#d85c7a] text-sm font-semibold text-white transition hover:bg-[#c9506d] disabled:opacity-50"
                  >
                    {saving ? "Preparando pedido..." : "Continuar para entrega"}
                  </button>
                )}
                {step === 2 && shippingOptions.length === 0 && (
                  <button
                    type="button"
                    onClick={calculateShipping}
                    disabled={loadingAddress || loadingShipping}
                    className="h-14 w-full rounded-2xl bg-[#d85c7a] text-sm font-semibold text-white transition hover:bg-[#c9506d] disabled:opacity-50"
                  >
                    {loadingShipping ? "Consultando entrega..." : "Ver opções de entrega"}
                  </button>
                )}
                {step === 2 && shippingOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={continueFromDelivery}
                    disabled={saving || !selectedShipping}
                    className="h-14 w-full rounded-2xl bg-[#d85c7a] text-sm font-semibold text-white transition hover:bg-[#c9506d] disabled:opacity-50"
                  >
                    {saving ? "Salvando entrega..." : "Continuar para pagamento"}
                  </button>
                )}
                <p className="mt-3 text-center text-xs text-zinc-500">
                  Seus dados são protegidos e usados apenas para concluir a compra.
                </p>
              </div>
            )}
          </section>

          <aside className={`${resumeOpen ? "block" : "hidden"} lg:sticky lg:top-8 lg:block`}>
            <div className="rounded-[28px] border border-[#eee2e6] bg-white p-5 shadow-[0_12px_40px_rgba(68,31,42,0.04)] sm:p-6">
              <h2 className="font-display text-2xl text-[#43232d]">
                Seu pedido
              </h2>
              <div className="mt-6 space-y-4">
                {checkoutItems.map((item, index) => {
                  const imageUrl =
                    getCheckoutImageUrl(item);

                  return (
                    <div key={`${item.product?.title}-${index}`} className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#eee2e6] bg-[#fcf9fa]">
                        <ProductImagePreview
                          src={imageUrl}
                          alt={item.product?.title}
                          className="h-full w-full"
                          imageClassName="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug text-zinc-900">
                          {item.product?.title}
                        </p>
                        {item.product?.subtitle && (
                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
                            {item.product.subtitle}
                          </p>
                        )}
                        {!order ? (
                          <div className="mt-2 inline-flex items-center rounded-full border border-[#eee2e6] bg-white">
                            <button
                              type="button"
                              aria-label={`Diminuir quantidade de ${item.product?.title}`}
                              onClick={() => updateCheckoutQuantity(index, -1)}
                              disabled={Number(item.quantity || 1) <= 1}
                              className="flex h-8 w-8 items-center justify-center text-zinc-500 transition hover:text-[#d85c7a] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="min-w-7 text-center text-xs font-semibold text-zinc-700">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Aumentar quantidade de ${item.product?.title}`}
                              onClick={() => updateCheckoutQuantity(index, 1)}
                              className="flex h-8 w-8 items-center justify-center text-zinc-500 transition hover:text-[#d85c7a]"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-zinc-500">
                            Quantidade: {item.quantity}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-semibold">
                          {formatMoney(Number(item.unit_price) * Number(item.quantity || 1))}
                        </p>
                        {!order && (
                          <button
                            type="button"
                            onClick={() => removeCheckoutItem(index)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-[#d85c7a]"
                          >
                            <Trash2 size={13} />
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 space-y-3 border-t border-[#eee2e6] pt-6 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Entrega</span>
                  <span>
                    {selectedShipping || order?.shipping_method
                      ? Number(selectedShipping?.discount || 0) > 0
                          ? formatMoney(selectedShipping.original_price)
                          : formatShippingPrice(shippingPrice)
                      : "A calcular"}
                  </span>
                </div>
                {Number(selectedShipping?.discount || 0) > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Desconto no frete</span>
                    <span>- {formatMoney(selectedShipping.discount)}</span>
                  </div>
                )}
                {pixDiscount > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Desconto exclusivo no PIX</span>
                    <span>- {formatMoney(pixDiscount)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between border-t border-[#eee2e6] pt-5">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-3xl font-semibold text-[#43232d]">
                    {formatMoney(paymentTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-7 space-y-3 rounded-2xl bg-[#fcf9fa] p-4 text-xs text-zinc-600">
                <p className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#d85c7a]" />
                  Compra protegida pelo Mercado Pago
                </p>
                <p className="flex items-center gap-2">
                  <Truck size={15} className="text-[#d85c7a]" />
                  Entrega calculada com segurança
                </p>
                <p className="flex items-center gap-2">
                  <Lock size={15} className="text-[#d85c7a]" />
                  Seus dados permanecem protegidos
                </p>
              </div>
            </div>
          </aside>
        </div>

        {!order && step === 1 && (
          <UpsellProducts
            excludedIds={
              checkoutCart.map(
                (item) =>
                  item.product_id ??
                  item.id
              )
            }
            onAdd={addCheckoutExtra}
            title="Adicione ao seu pedido"
            description="Complete sua rotina agora; o item entrará no mesmo checkout."
          />
        )}
      </main>
    </div>
  );
}
