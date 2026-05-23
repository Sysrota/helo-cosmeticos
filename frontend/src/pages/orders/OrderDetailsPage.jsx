import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import Formatter
  from "../../utils/Formatter";

import { api }
  from "../../services/api";

import { socket }
  from "../../websocket/socket";

import {
  OrderHeader,
} from "../../components/orders/OrderHeader";

import {
  OrderItemsTable,
} from "../../components/orders/OrderItemsTable";

import {
  OrderShipping,
} from "../../components/orders/OrderShipping";

import {
  OrderSummary,
} from "../../components/orders/OrderSummary";


import {
  ProductSearch,
} from "../../components/orders/ProductSearch";
import { OrderPixCard } from "../../components/orders/OrderPixCard";
import { OrderCreditCardCard } from "../../components/orders/OrderCreditCardCard";
import { OrderPaymentSelector } from "../../components/orders/OrderPaymentSelector";


const API_URL =
  import.meta.env
    .VITE_API_URL;

export default function OrderDetailsPage() {

  const { id } =
    useParams();

  const [order, setOrder] =
    useState(null);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [cep, setCep] =
    useState("");

  const [shippingOptions,
    setShippingOptions] =
    useState([]);

  const [pixData,
    setPixData] =
    useState(null);

  const [loadingPix,
    setLoadingPix] =
    useState(false);

  const [loadingShipping,
    setLoadingShipping] =
    useState(false);

  const [paymentApproved,
    setPaymentApproved] =
    useState(false);

  const [storeConfig,
    setStoreConfig] =
    useState(null);

  const [selectedPaymentMethod,
    setSelectedPaymentMethod] =
    useState("pix");

  // =========================
  // LOAD
  // =========================

  async function loadOrder() {

    const res =
      await fetch(
        `${API_URL}/orders/${id}`
      );

    const data =
      await res.json();

    setOrder(data);
  }

  async function loadProducts() {

    const res =
      await fetch(
        `${API_URL}/products?limit=100`
      );

    const data =
      await res.json();

    setProducts(
      data.items || []
    );
  }

  useEffect(() => {

    async function init() {

      try {

        setLoading(true);
        loadStoreConfig();

        await Promise.all([
          loadOrder(),
          loadProducts(),
        ]);

      } finally {

        setLoading(false);
      }
    }

    init();

  }, [id]);

  // =========================
  // SOCKET CONNECT
  // =========================

  useEffect(() => {

    socket.on(
      "connect",
      () => {

        console.log(
          "SOCKET CONECTADO",
          socket.id
        );
      }
    );

    return () => {

      socket.off(
        "connect"
      );
    };

  }, []);

  // =========================
  // SOCKET PAYMENT
  // =========================

  useEffect(() => {

    socket.on(
      "order_updated",
      (updatedOrder) => {

        if (
          updatedOrder.id ===
          order?.id
        ) {

          setOrder(
            updatedOrder
          );

          // APPROVED
          if (

            updatedOrder.payment_status ===
            "approved"

          ) {

            setPaymentApproved(
              true
            );

            setTimeout(() => {

              setPaymentApproved(
                false
              );

            }, 6000);
          }
        }
      }
    );

    return () => {

      socket.off(
        "order_paid"
      );
    };

  }, [order?.id]);

  // =========================
  // TOTALS
  // =========================

  const subtotal =
    useMemo(() => {

      if (!order) {
        return 0;
      }

      return (
        order.items?.reduce(
          (total, item) => {

            return (
              total +
              item.quantity *
              item.unit_price
            );
          },
          0
        ) || 0
      );

    }, [order]);

  const total =
    subtotal +
    Number(
      order?.shipping || 0
    ) -
    Number(
      order?.discount || 0
    );

  // =========================
  // ITEMS
  // =========================

  function addProduct(
    product
  ) {

    const exists =
      order.items.find(
        (item) =>
          item.product_id ===
          product.id
      );

    if (exists) {

      setOrder({
        ...order,

        items:
          order.items.map(
            (item) => {

              if (
                item.product_id ===
                product.id
              ) {

                return {
                  ...item,

                  quantity:
                    item.quantity + 1,
                };
              }

              return item;
            }
          ),
      });

      return;
    }

    setOrder({
      ...order,

      items: [
        ...order.items,

        {
          id:
            Date.now(),

          product_id:
            product.id,

          quantity: 1,

          unit_price:
            product.price,

          product,
        },
      ],
    });
  }

  function updateQuantity(
    productId,
    quantity
  ) {

    if (quantity <= 0) {
      return;
    }

    setOrder({
      ...order,

      items:
        order.items.map(
          (item) => {

            if (
              item.product_id ===
              productId
            ) {

              return {
                ...item,
                quantity,
              };
            }

            return item;
          }
        ),
    });
  }

  function removeItem(
    productId
  ) {

    setOrder({
      ...order,

      items:
        order.items.filter(
          (item) =>
            item.product_id !==
            productId
        ),
    });
  }

  // =========================
  // SAVE
  // =========================

  async function saveOrder() {

    await fetch(
      `${API_URL}/orders/${id}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...order,

          subtotal,

          total,
        }),
      }
    );
  }

  // =========================
  // SHIPPING
  // =========================

  async function calculateShipping() {

    try {

      setLoadingShipping(
        true
      );

      const { data } =
        await api.post(
          "/shipping/calculate",
          {
            cep,

            order_id:
              order.id,
          }
        );

      setShippingOptions(
        data
      );

    } catch (error) {

      console.log(error);

      alert(
        error?.response?.data?.error ||

        "Erro ao calcular frete"
      );

    } finally {

      setLoadingShipping(
        false
      );
    }
  }

  // =========================
  // PIX
  // =========================

  async function generatePix() {

    try {

      setLoadingPix(
        true
      );

      const { data } =
        await api.post(
          "/payment/pix",
          {
            order_id:
              order.id,
          }
        );

      setPixData(data);

    } catch (error) {

      console.log(error);

      alert(
        error?.response?.data?.error ||

        "Erro ao gerar PIX"
      );

    } finally {

      setLoadingPix(
        false
      );
    }
  }

  // =========================
  // LOADING
  // =========================

  if (loading || !order) {

    return (
      <div className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-zinc-100
      ">
        Carregando...
      </div>
    );
  }

  async function loadStoreConfig() {
    const res =
      await fetch(
        `${API_URL}/store-config`
      );

    const data =
      await res.json();

    setStoreConfig(data);
  }

return (
  <div className="
    bg-zinc-100
    min-h-screen

    p-3
    lg:p-6
  ">

    <div className="
      max-w-[1700px]
      mx-auto

      flex
      flex-col

      gap-1
    ">

      {/* PAYMENT APPROVED */}
      {paymentApproved && (

        <div className="
          bg-green-500
          text-white

          rounded-3xl

          p-4

          shadow-lg

          flex
          items-center
          justify-between
        ">

          <div>

            <div className="
              text-2xl
              font-bold
            ">
              Pagamento aprovado 🎉
            </div>

            <div className="
              opacity-90
              mt-1
            ">
              O pedido foi pago
              a instituição financeira já confirmou o pagamento
            </div>
          </div>

          <div className="
            text-right
          ">

            <div className="
              text-sm
              opacity-80
            ">
              Status
            </div>

            <div className="
              text-xl
              font-bold
            ">
              PAGO
            </div>
          </div>
        </div>
      )}

      {order?.payment_status ===
        "rejected" && (

          <div className="
            bg-red-500
            text-white

            rounded-3xl

            p-4

            shadow-lg

            flex
            items-center
            justify-between
          ">

            <div>

              <div className="
                text-2xl
                font-bold
              ">
                Pagamento recusado
              </div>

              <div className="
                opacity-90
                mt-1
              ">
                A operadora recusou
                o pagamento do cartão
              </div>
            </div>

            <div className="
              text-right
            ">

              <div className="
                text-sm
                opacity-80
              ">
                Status
              </div>

              <div className="
                text-xl
                font-bold
              ">
                RECUSADO
              </div>
            </div>
          </div>
        )
      }

      {/* HEADER */}
      <OrderHeader
        order={order}
        saveOrder={saveOrder}
      />

{/* MAIN */}
<div className="
  grid
  grid-cols-1
  xl:grid-cols-[1fr_340px]
  gap-6
  items-start
">

  {/* CONTENT */}
  <div className="
    flex
    flex-col
    gap-5
  ">

    {/* ITEMS */}
    <OrderItemsTable
      items={order.items}
      updateQuantity={
        updateQuantity
      }
      removeItem={
        removeItem
      }
    />

    {/* SEARCH */}
    <ProductSearch
      products={products}
      addProduct={
        addProduct
      }
    />

    {/* CHECKOUT */}
    <div className="
      grid
      grid-cols-1
      xl:grid-cols-2
      gap-5
    ">

      {/* SHIPPING */}
      <OrderShipping
        cep={cep}
        setCep={setCep}
        calculateShipping={
          calculateShipping
        }
        loadingShipping={
          loadingShipping
        }
        shippingOptions={
          shippingOptions
        }
        order={order}
        setOrder={setOrder}
      />

      {/* PAYMENT */}
      <div className="
        flex
        flex-col
        gap-5
      ">

        <OrderPaymentSelector
          methods={
            storeConfig
              ?.payment_methods || []
          }

          selectedMethod={
            selectedPaymentMethod
          }

          setSelectedMethod={
            setSelectedPaymentMethod
          }
        />

        {
          selectedPaymentMethod ===
          "pix" && (

            <OrderPixCard
              generatePix={
                generatePix
              }

              loadingPix={
                loadingPix
              }

              pixData={pixData}

              order={order}
            />
          )
        }

        {
          selectedPaymentMethod ===
          "credit_card" && (

            <OrderCreditCardCard
              order={order}
            />
          )
        }
      </div>
    </div>
  </div>

  {/* SIDEBAR */}
  <div className="
    sticky
    top-6
  ">

    <OrderSummary
      subtotal={subtotal}
      order={order}
      total={total}
      setOrder={setOrder}
    />
  </div>
</div>
    </div>
  </div>
);
}