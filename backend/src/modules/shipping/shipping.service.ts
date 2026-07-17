import axios from "axios";

import { prisma } from "../../config/prisma.js";
import { getCommercialPolicy } from "../store-config/store-config.service.js";
import { quoteMandaBemShipping } from "./manda-bem/manda-bem.service.js";

interface Props {
  cep: string;
  order_id: number;
  allOptions?: boolean;
}

interface ProductShippingProps {
  cep: string;
  product_id: number;
  quantity: number;
  allOptions?: boolean;
}

export interface ShippingOption {
  name: string;
  price: number;
  deadline: string;
  melhor_envio_service_id?: number;
  melhor_envio_company_name?: string;
  melhor_envio_service_name?: string;
  manda_bem_service?: string;
  original_price?: number;
  discount?: number;
  min_days?: number;
  max_days?: number;
}

interface ShippingPackage {
  cleanCep: string;
  totalWeight: number;
  maxHeight: number;
  maxWidth: number;
  totalLength: number;
  insuranceValue: number;
  freeShipping?: boolean;
  allOptions?: boolean;
}

const STORE_ORIGIN_CEP = "74976040";

const MOTO_UBER_CITIES = new Set([
  "aparecida de goiania",
  "goiania",
  "goianira",
  "hidrolandia",
  "senador canedo",
  "trindade",
]);

const MOTO_UBER_PRICE = 0;

const LOCAL_PICKUP_OPTION: ShippingOption = {
  name: "Retirar em mãos",
  price: 0,
  deadline: "Combinar retirada",
  min_days: 0,
  max_days: 0,
};

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isLocalDeliveryCovered(address: { city: string; state: string }) {
  return (
    normalizeLocation(address.state) === "go" &&
    MOTO_UBER_CITIES.has(normalizeLocation(address.city))
  );
}

export function getMotoUberShippingOption(
  address: { city: string; state: string },
  enabled: boolean,
  fixedPrice: boolean
): ShippingOption | null {
  if (!enabled || !isLocalDeliveryCovered(address)) {
    return null;
  }

  return {
    name: "Moto Uber",
    price: MOTO_UBER_PRICE,
    deadline: "Entrega no mesmo dia em horário comercial",
    min_days: 0,
    max_days: 0,
  };
}

export function getLocalShippingOptions(
  address: { city: string; state: string },
  enabled: boolean,
  fixedMotoUberPrice: boolean
): ShippingOption[] {
  if (!enabled || !isLocalDeliveryCovered(address)) {
    return [];
  }

  const motoUberOption = getMotoUberShippingOption(
    address,
    enabled,
    fixedMotoUberPrice
  );

  return [LOCAL_PICKUP_OPTION, ...(motoUberOption ? [motoUberOption] : [])];
}

function applyFreeShipping(
  freeShipping: boolean,
  option: ShippingOption
): ShippingOption {
  const originalPrice = Number(option.price);
  const price = freeShipping ? 0 : originalPrice;

  return {
    ...option,
    price,
    original_price: originalPrice,
    discount: freeShipping ? originalPrice : 0,
  };
}

function getShippingPriority(option: ShippingOption) {
  if (option.name === "Moto Uber") return 0;
  if (option.name === "Retirar em mãos") return 1;

  return 2;
}

function getDeadlineMin(option: ShippingOption) {
  return Number.isFinite(option.min_days) ? Number(option.min_days) : 999;
}

function getDeadlineMax(option: ShippingOption) {
  return Number.isFinite(option.max_days) ? Number(option.max_days) : 999;
}

function sortShippingOptions(options: ShippingOption[]) {
  return [...options].sort((first, second) => {
    const priorityDiff =
      getShippingPriority(first) - getShippingPriority(second);

    if (priorityDiff !== 0) return priorityDiff;

    const originalPriceFirst = Number(first.original_price ?? first.price);
    const originalPriceSecond = Number(second.original_price ?? second.price);
    const priceDiff = originalPriceFirst - originalPriceSecond;

    if (priceDiff !== 0) return priceDiff;

    const minDiff = getDeadlineMin(first) - getDeadlineMin(second);

    if (minDiff !== 0) return minDiff;

    return getDeadlineMax(first) - getDeadlineMax(second);
  });
}

const MAX_PREFERRED_DEADLINE_DAYS = 6;

function getBestShippingOption(options: ShippingOption[]) {
  const sorted = sortShippingOptions(options);

  const withinDeadline = sorted.filter(
    (option) => getDeadlineMax(option) <= MAX_PREFERRED_DEADLINE_DAYS
  );

  return (withinDeadline.length ? withinDeadline : sorted).slice(0, 1);
}

function formatDeadline(minDays: number, maxDays: number) {
  if (minDays === maxDays) {
    return `Entregue em ${maxDays} dias úteis`;
  }

  return `Entregue em ${minDays} a ${maxDays} dias úteis`;
}

function getDeliveryRange(service: any) {
  const min =
    Number(service.custom_delivery_range?.min) ||
    Number(service.delivery_range?.min) ||
    Number(service.custom_delivery_time) ||
    Number(service.delivery_time) ||
    999;

  const max =
    Number(service.custom_delivery_range?.max) ||
    Number(service.delivery_range?.max) ||
    Number(service.custom_delivery_time) ||
    Number(service.delivery_time) ||
    min;

  return {
    min,
    max,
  };
}

export async function findAddressByCep(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");

  if (cleanCep.length !== 8) {
    throw new Error("CEP inválido");
  }

  const { data } = await axios.get(
    `https://viacep.com.br/ws/${cleanCep}/json/`
  );

  if (data.erro) {
    throw new Error("CEP não encontrado");
  }

  return {
    zipcode: data.cep || cep,
    street: data.logradouro || "",
    district: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
  };
}

interface CarrierPackageData {
  width: number;
  height: number;
  length: number;
  weight: number;
}

// Transportadoras de carga aérea: excluídas por completo (cosméticos com
// aerossol/álcool costumam ser restritos ou proibidos em modal aéreo).
const EXCLUDED_MELHOR_ENVIO_COMPANIES = new Set([
  "latam cargo",
  "azul cargo express",
  "gollog",
  "gol linhas aereas",
]);

// PAC e SEDEX (Correios) saem, tanto do Melhor Envio quanto da Manda Bem:
// a loja so envia por transportadora. Comparacao exata (nao "includes") pra
// nao pegar servicos tipo ".Package" da Jadlog no Melhor Envio.
const EXCLUDED_CORREIOS_SERVICE_NAMES = new Set(["pac", "sedex"]);

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function isExcludedMelhorEnvioService(service: any) {
  const company = String(service.company?.name || "")
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .trim();
  const serviceName = String(service.name || "")
    .toLowerCase()
    .trim();

  return (
    EXCLUDED_MELHOR_ENVIO_COMPANIES.has(company) ||
    EXCLUDED_CORREIOS_SERVICE_NAMES.has(serviceName)
  );
}

async function fetchMelhorEnvioOptions(
  cleanCep: string,
  packageData: CarrierPackageData,
  insuranceValue: number
): Promise<ShippingOption[]> {
  const payload = {
    from: {
      postal_code: STORE_ORIGIN_CEP,
    },

    to: {
      postal_code: cleanCep,
    },

    package: packageData,

    options: {
      insurance_value: insuranceValue,
      receipt: false,
      own_hand: false,
    },
  };

  try {
    const melhorEnvioResponse = await axios.post(
      "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "HeloCosmeticos",
        },
      }
    );

    const rawServices: any[] = Array.isArray(melhorEnvioResponse.data)
      ? melhorEnvioResponse.data
      : [];

    const validServices = rawServices.filter((service: any) => {
      const price = Number(service.price);
      const range = getDeliveryRange(service);

      return (
        !service.error &&
        price > 0 &&
        range.min > 0 &&
        range.max > 0 &&
        !isExcludedMelhorEnvioService(service)
      );
    });

    return validServices.map((service: any) => {
      const range = getDeliveryRange(service);
      const serviceName = [
        service.company?.name,
        service.name,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        name: serviceName || "Entrega",
        price: Number(service.price),
        deadline: formatDeadline(range.min, range.max),
        min_days: range.min,
        max_days: range.max,
        melhor_envio_service_id: Number(service.id),
        melhor_envio_company_name: service.company?.name || "",
        melhor_envio_service_name: service.name || "",
      };
    });
  } catch (error) {
    console.error("[ME] Erro no cálculo:", {
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      destination: cleanCep,
      response: axios.isAxiosError(error) ? error.response?.data : error,
    });

    return [];
  }
}

async function fetchMandaBemOptions(
  cleanCep: string,
  packageData: CarrierPackageData,
  insuranceValue: number
): Promise<ShippingOption[]> {
  const quotes = await quoteMandaBemShipping({
    cepOrigem: STORE_ORIGIN_CEP,
    cepDestino: cleanCep,
    peso: packageData.weight,
    altura: packageData.height,
    largura: packageData.width,
    comprimento: packageData.length,
    valorSeguro: insuranceValue,
  });

  // Mesma politica do Melhor Envio: PAC e SEDEX (Correios) ficam de fora.
  const allowedQuotes = quotes.filter(
    (quote) =>
      !EXCLUDED_CORREIOS_SERVICE_NAMES.has(quote.servico.toLowerCase())
  );

  return allowedQuotes.map((quote) => ({
    name: `Manda Bem ${quote.name || quote.servico}`,
    price: quote.price,
    deadline: formatDeadline(quote.days, quote.days),
    min_days: quote.days,
    max_days: quote.days,
    manda_bem_service: quote.servico,
  }));
}

export async function requestShippingOptions({
  cleanCep,
  totalWeight,
  maxHeight,
  maxWidth,
  totalLength,
  insuranceValue,
  freeShipping = false,
  allOptions = false,
}: ShippingPackage): Promise<ShippingOption[]> {
  const packageData = {
    width: Math.max(Number(maxWidth || 0), 11),
    height: Math.max(Number(maxHeight || 0), 2),
    length: Math.max(Number(totalLength || 0), 6),
    weight: Math.max(Number(totalWeight || 0), 0.3),
  };

  const safeInsuranceValue = Math.max(Number(insuranceValue || 0), 0);

  const [melhorEnvioOptions, mandaBemOptions] = await Promise.all([
    fetchMelhorEnvioOptions(cleanCep, packageData, safeInsuranceValue),
    fetchMandaBemOptions(cleanCep, packageData, safeInsuranceValue),
  ]);

  const shippingOptions = [
    ...melhorEnvioOptions,
    ...mandaBemOptions,
  ].map((option) => applyFreeShipping(freeShipping, option));

  if (!shippingOptions.length) {
    throw new Error("Nenhuma transportadora disponível");
  }

  return allOptions
    ? sortShippingOptions(shippingOptions)
    : getBestShippingOption(shippingOptions);
}

export async function calculateProductShipping({
  cep,
  product_id,
  quantity,
  allOptions = false,
}: ProductShippingProps): Promise<ShippingOption[]> {
  const cleanCep = cep.replace(/\D/g, "");

  const address = await findAddressByCep(cleanCep);

  const product = await prisma.product.findUnique({
    where: {
      id: product_id,
    },
  });

  if (!product || product.is_active === false) {
    throw new Error("Produto indisponível");
  }

  const safeQuantity = Math.min(
    99,
    Math.max(1, Math.floor(Number(quantity) || 1))
  );

  const policy = await getCommercialPolicy();

  const subtotal = Number(product.price || 0) * safeQuantity;

  const hasFreeShipping = subtotal > policy.free_shipping_minimum;

  const localOptions = getLocalShippingOptions(
    address,
    policy.moto_uber_enabled,
    hasFreeShipping
  );

  try {
    const carrierOptions = await requestShippingOptions({
      cleanCep,
      totalWeight: Number(product.weight || 0) * safeQuantity,
      maxHeight: Number(product.height || 1),
      maxWidth: Number(product.width || 1),
      totalLength: Number(product.length || 1) * safeQuantity,
      insuranceValue: subtotal,
      freeShipping: hasFreeShipping,
      allOptions,
    });

    const options = [...localOptions, ...carrierOptions];

    return allOptions
      ? sortShippingOptions(options)
      : getBestShippingOption(options);
  } catch (error) {
    if (localOptions.length) {
      return allOptions
        ? sortShippingOptions(localOptions)
        : getBestShippingOption(localOptions);
    }

    throw error;
  }
}

export async function calculateShipping({
  cep,
  order_id,
  allOptions = false,
}: Props): Promise<ShippingOption[]> {
  const cleanCep = cep.replace(/\D/g, "");

  const address = await findAddressByCep(cleanCep);

  const order = await prisma.order.findUnique({
    where: {
      id: order_id,
    },

    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Pedido não encontrado");
  }

  if (!order.items.length) {
    throw new Error(
      "Por favor, informe pelo menos um produto para calcular o frete"
    );
  }

  const policy = await getCommercialPolicy();

  const subtotal = Number(order.subtotal || 0);

  const hasFreeShipping = subtotal > policy.free_shipping_minimum;

  const localOptions = getLocalShippingOptions(
    address,
    policy.moto_uber_enabled,
    hasFreeShipping
  );

  const totalWeight = order.items.reduce((total, item) => {
    return total + Number(item.product?.weight || 0) * item.quantity;
  }, 0);

  const maxHeight = Math.max(
    ...order.items.map((item) => Number(item.product?.height || 1))
  );

  const maxWidth = Math.max(
    ...order.items.map((item) => Number(item.product?.width || 1))
  );

  const totalLength = order.items.reduce((total, item) => {
    return total + Number(item.product?.length || 1) * item.quantity;
  }, 0);

  try {
    const carrierOptions = await requestShippingOptions({
      cleanCep,
      totalWeight,
      maxHeight,
      maxWidth,
      totalLength,
      insuranceValue: subtotal,
      freeShipping: hasFreeShipping,
      allOptions,
    });

    const options = [
      ...localOptions,
      ...carrierOptions,
    ];

    return allOptions
      ? sortShippingOptions(options)
      : getBestShippingOption(options);
  } catch (error) {
    if (localOptions.length) {
      return allOptions
        ? sortShippingOptions(localOptions)
        : getBestShippingOption(localOptions);
    }

    throw error;
  }
}
