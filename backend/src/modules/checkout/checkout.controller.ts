import {
  Request,
  Response,
} from "express";

import {
  prisma,
} from "../../config/prisma.js";
import {
  calculateShipping,
} from "../shipping/shipping.service.js";
import {
  sendOrderPendingPaymentEmail,
} from "../notification/order-email.service.js";
import {
  sendOrderPendingPaymentWhatsApp,
} from "../notification/order-whatsapp-template.service.js";
import {
  syncOrderPaymentStatus,
} from "../payment-mercado-pago/payment-sync.service.js";
import {
  notifyManagersAboutOrder,
} from "../manager/manager-notification.service.js";
import {
  generateOrderNumber,
} from "../order/order-number.service.js";
import {
  calculateOrderTotals,
} from "../coupons/coupon-totals.service.js";
import {
  applyCouponToOrderService,
} from "../coupons/coupons.service.js";

function normalizeDigits(value?: string | null) {
  return String(value || "")
    .replace(/\D/g, "");
}

function normalizePhone(value?: string | null) {
  const digits =
    normalizeDigits(value);

  if (
    digits.startsWith("55") &&
    digits.length > 11
  ) {
    return digits.slice(2);
  }

  return digits;
}

function phoneMatches(
  left?: string | null,
  right?: string | null
) {
  const leftPhone =
    normalizePhone(left);

  const rightPhone =
    normalizePhone(right);

  if (!leftPhone || !rightPhone) {
    return false;
  }

  return (
    leftPhone === rightPhone ||
    leftPhone.endsWith(rightPhone) ||
    rightPhone.endsWith(leftPhone)
  );
}

function firstName(value?: string | null) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)[0] || "";
}

async function findCheckoutContact(
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  }
) {
  const contactByExactData =
    await prisma.contact.findFirst({
      where: {
        OR: [
          {
            phone:
              customer.phone,
          },
          ...(customer.email
            ? [
                {
                  email:
                    customer.email,
                },
              ]
            : []),
        ],
      },
    });

  if (contactByExactData) {
    return contactByExactData;
  }

  const customerFirstName =
    firstName(
      customer.name
    );

  if (
    !customerFirstName ||
    !normalizePhone(customer.phone)
  ) {
    return null;
  }

  const recentContacts =
    await prisma.contact.findMany({
      orderBy: {
        updated_at:
          "desc",
      },
      take:
        500,
    });

  return recentContacts.find((contact) =>
    firstName(contact.name) ===
      customerFirstName &&
    phoneMatches(
      contact.phone,
      customer.phone
    )
  ) || null;
}

async function updateCheckoutContact(
  contactId: number,
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    cpf?: string;
    city?: string;
    state?: string;
  }
) {
  const currentContact =
    await prisma.contact.findUnique({
      where: {
        id:
          contactId,
      },
    });

  if (!currentContact) {
    return null;
  }

  const phoneOwner =
    customer.phone
      ? await prisma.contact.findUnique({
          where: {
            phone:
              customer.phone,
          },
        })
      : null;

  const emailOwner =
    customer.email
      ? await prisma.contact.findFirst({
          where: {
            email:
              customer.email,
          },
        })
      : null;

  return prisma.contact.update({
    where: {
      id:
        contactId,
    },
    data: {
      name:
        customer.name ||
        currentContact.name,
      phone:
        !phoneOwner ||
        phoneOwner.id === contactId
          ? customer.phone ||
            currentContact.phone
          : currentContact.phone,
      email:
        !emailOwner ||
        emailOwner.id === contactId
          ? customer.email ||
            currentContact.email
          : currentContact.email,
      cpf:
        customer.cpf ||
        currentContact.cpf,
      city:
        customer.city ||
        currentContact.city,
      state:
        customer.state ||
        currentContact.state,
    },
  });
}

export async function createCheckoutController(
  req: Request,
  res: Response
) {

  try {

    const {
      customer,
      cart,
      shipping,
      coupon_code,
    } = req.body;

    // =====================
    // VALIDATE
    // =====================

    if (
      !cart?.length
    ) {

      return res.status(400).json({
        error:
          "Carrinho vazio",
      });
    }

    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.email
    ) {

      return res.status(400).json({
        error:
          "Dados do cliente incompletos",
      });
    }

    // =====================
    // CONTACT
    // =====================

    let contact =
      await findCheckoutContact(
        customer
      );

    // =====================
    // CREATE CONTACT
    // =====================

    if (!contact) {

      contact =
        await prisma.contact.create({

          data: {

            name:
              customer.name,

            phone:
              customer.phone,

            email:
              customer.email,
          },
        });
    } else {
      contact =
        await updateCheckoutContact(
          contact.id,
          customer
        ) || contact;
    }

    // =====================
    // PRODUCTS
    // =====================

    const products =
      await prisma.product.findMany({

        where: {

          id: {

            in:
              cart.map(
                (item: any) =>
                  item.product_id ??
                  item.id
              ),
          },
        },
      });

    if (
      products.length !==
      new Set(
        cart.map(
          (item: any) =>
            item.product_id ??
            item.id
        )
      ).size
    ) {

      return res.status(400).json({
        error:
          "Um ou mais produtos não estão disponíveis",
      });
    }

    // =====================
    // ITEMS
    // =====================

    let subtotal = 0;

    const items =
      cart.map(
        (item: any) => {

          const product =
            products.find(
              (p) =>
                p.id ===
                (
                  item.product_id ??
                  item.id
                )
            );

          const unit_price =
            Number(
              product?.price || 0
            );

          const quantity =
            Number(
              item.quantity || 1
            );

          const total =
            unit_price *
            quantity;

          subtotal += total;

          return {

            product_id:
              product!.id,

            quantity,

            unit_price,

            total,
          };
        }
      );

    // =====================
    // SHIPPING
    // =====================

    const shippingPrice =
      Number(
        shipping?.price || 0
      );

    // =====================
    // TOTAL
    // =====================

    const total =
      subtotal +
      shippingPrice;

    // =====================
    // ORDER
    // =====================

    let order =
      await prisma.$transaction(
        async (transaction) => {
          const orderNumber =
            await generateOrderNumber(
              transaction
            );

          return transaction.order.create({

        data: {

          order_number:
            orderNumber,

          contact_id:
            contact.id,

          status:
            "pending",

          payment_status:
            "pending",

          subtotal,

          shipping:
            shippingPrice,

          shipping_price:
            shippingPrice,

          shipping_method:
            shipping?.name,

          shipping_deadline:
            shipping?.delivery_time
              ? `${shipping.delivery_time} dias úteis`
              : shipping?.deadline ||
                null,

          melhor_envio_service_id:
            shipping?.melhor_envio_service_id
              ? Number(
                  shipping.melhor_envio_service_id
                )
              : null,

          total,

          items: {

            create:
              items,
          },
        },

        include: {

          contact: true,

          items: {

            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
          });
        }
      );

    if (coupon_code) {
      const couponResult =
        await applyCouponToOrderService(
          order.id,
          String(coupon_code)
        );

      order =
        couponResult.order;
    }

    void notifyManagersAboutOrder(
      order.id,
      "order_created"
    ).catch((error) => {
      console.error(
        "Erro ao notificar gestores sobre pedido iniciado:",
        error
      );
    });

      console.log("Retornando Checkout: ", order)

    return res.json(
      order
    );

  } catch (error) {

    console.log(
      "CHECKOUT ERROR:",
      error
    );

    return res.status(500).json({

      error:
        "Erro ao finalizar checkout",
    });
  }
}

export async function updateCheckoutDeliveryController(
  req: Request,
  res: Response
) {

  try {

    const orderId =
      Number(req.params.id);

    const {
      customer,
      shipping_method,
    } = req.body;

    if (
      !orderId ||
      !customer?.zipcode ||
      !customer?.street ||
      !customer?.number ||
      !customer?.district ||
      !customer?.city ||
      !customer?.state
    ) {

      return res.status(400).json({
        error:
          "Endereço incompleto",
      });
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          coupon: true,
        },
      });

    if (!order) {

      return res.status(404).json({
        error:
          "Pedido não encontrado",
      });
    }

    const options =
      await calculateShipping({
        cep:
          customer.zipcode,
        order_id:
          orderId,
      });

    const selectedShipping =
      options.find(
        (option) =>
          option.name ===
          shipping_method
      ) || options[0];

    const shippingPrice =
      Number(
        selectedShipping.price
      );

    const totals =
      await calculateOrderTotals({
        subtotal:
          order.subtotal,
        shipping:
          shippingPrice,
        coupon:
          order.coupon,
      });

    await updateCheckoutContact(
      order.contact_id,
      customer
    );

    const address =
      await prisma.contactAddress.findFirst({
        where: {
          contact_id:
            order.contact_id,
        },
      });

    const addressData = {
      cep:
        customer.zipcode,
      street:
        customer.street,
      number:
        customer.number,
      complement:
        customer.complement,
      district:
        customer.district,
      city:
        customer.city,
      state:
        customer.state,
    };

    if (address) {

      await prisma.contactAddress.update({
        where: {
          id:
            address.id,
        },
        data:
          addressData,
      });

    } else {

      await prisma.contactAddress.create({
        data: {
          contact_id:
            order.contact_id,
          ...addressData,
        },
      });
    }

    const updatedOrder =
      await prisma.order.update({
        where: {
          id:
            orderId,
        },
        data: {
          shipping:
            shippingPrice,
          shipping_price:
            shippingPrice,
          shipping_method:
            selectedShipping.name,
          shipping_deadline:
            selectedShipping.deadline,
          melhor_envio_service_id:
            selectedShipping.melhor_envio_service_id
              ? Number(
                  selectedShipping.melhor_envio_service_id
                )
              : order.melhor_envio_service_id,
          discount:
            totals.discount,
          coupon_discount:
            totals.couponDiscount,
          payment_discount:
            0,
          total:
            totals.total,
        },
        include: {
          contact: true,
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
      });

    void sendOrderPendingPaymentEmail(
      updatedOrder.id
    ).catch(
      (error) => {
        console.error(
          "Erro ao iniciar e-mail de pedido pendente:",
          error
        );
      }
    );

    void sendOrderPendingPaymentWhatsApp(
      updatedOrder.id
    ).catch(
      (error) => {
        console.error(
          "Erro ao iniciar WhatsApp de pedido pendente:",
          error
        );
      }
    );

    void notifyManagersAboutOrder(
      updatedOrder.id,
      "delivery_selected"
    ).catch((error) => {
      console.error(
        "Erro ao notificar gestores sobre entrega definida:",
        error
      );
    });

    return res.json(
      updatedOrder
    );

  } catch (error) {

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar entrega",
    });
  }
}

export async function trackOrderController(
  req: Request,
  res: Response
) {
  const orderCode =
    String(
      req.body.order_id || ""
    ).trim();
  const orderId =
    Number(orderCode);
  const email =
    String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0 ||
    !email
  ) {
    return res.status(400).json({
      error:
        "Informe o número do pedido e o e-mail da compra.",
    });
  }

  let order =
    await prisma.order.findFirst({
      where: {
        OR: [
          {
            order_number:
              orderCode,
          },
          {
            id:
              orderId,
          },
        ],
      },
      include: {
        contact: {
          include: {
            addresses: {
              orderBy: {
                updated_at:
                  "desc",
              },
              take: 1,
            },
          },
        },
        coupon: true,
        shipping_events_list: {
          orderBy: {
            occurred_at:
              "desc",
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

  if (order) {
    try {
      const syncResult =
        await syncOrderPaymentStatus(
          order
        );

      if (syncResult?.order) {
        order =
          await prisma.order.findFirst({
            where: {
              OR: [
                {
                  order_number:
                    orderCode,
                },
                {
                  id:
                    orderId,
                },
              ],
            },
            include: {
              contact: {
                include: {
                  addresses: {
                    orderBy: {
                      updated_at:
                        "desc",
                    },
                    take: 1,
                  },
                },
              },
              coupon: true,
              shipping_events_list: {
                orderBy: {
                  occurred_at:
                    "desc",
                },
              },
              items: {
                include: {
                  product: {
                    include: {
                      images: true,
                    },
                  },
                },
              },
            },
          });
      }
    } catch (error) {
      console.error(
        "Erro ao sincronizar pagamento no acompanhamento:",
        error
      );
    }
  }

  if (
    !order ||
    order.contact.email
      ?.trim()
      .toLowerCase() !==
      email
  ) {
    return res.status(404).json({
      error:
        "Pedido não encontrado para os dados informados.",
    });
  }

  return res.json({
    id:
      order.id,
    order_number:
      order.order_number,
    status:
      order.status,
    payment_status:
      order.payment_status,
    payment_method:
      order.payment_method,
    paid_at:
      order.paid_at,
    subtotal:
      order.subtotal,
    shipping:
      order.shipping,
    discount:
      order.discount,
    coupon_code:
      order.coupon_code,
    coupon_discount:
      order.coupon_discount,
    payment_discount:
      order.payment_discount,
    total:
      order.total,
    pix_code:
      order.pix_code,
    pix_qrcode:
      order.pix_qrcode,
    boleto_url:
      order.boleto_url,
    boleto_barcode:
      order.boleto_barcode,
    contact_cpf:
      order.contact.cpf,
    shipping_method:
      order.shipping_method,
    shipping_deadline:
      order.shipping_deadline,
    melhor_envio_service_id:
      order.melhor_envio_service_id,
    melhor_envio_order_id:
      order.melhor_envio_order_id,
    melhor_envio_protocol:
      order.melhor_envio_protocol,
    melhor_envio_print_url:
      order.melhor_envio_print_url,
    tracking_code:
      order.tracking_code,
    tracking_url:
      order.tracking_url,
    shipping_status:
      order.shipping_status,
    shipping_status_updated_at:
      order.shipping_status_updated_at,
    shipping_events:
      order.shipping_events_list.map(
        (event) => ({
          id:
            event.id,
          event:
            event.event,
          status:
            event.status,
          title:
            event.title,
          description:
            event.description,
          location:
            event.location,
          tracking_code:
            event.tracking_code,
          tracking_url:
            event.tracking_url,
          occurred_at:
            event.occurred_at,
        })
      ),
    created_at:
      order.created_at,
    customer_name:
      order.contact.name,
    customer_phone:
      order.contact.phone,
    address:
      order.contact.addresses[0]
        ? {
          cep:
            order.contact.addresses[0].cep,
          street:
            order.contact.addresses[0].street,
          number:
            order.contact.addresses[0].number,
          district:
            order.contact.addresses[0].district,
          city:
            order.contact.addresses[0].city,
          state:
            order.contact.addresses[0].state,
        }
        : null,
    items:
      order.items.map(
        (item) => ({
          id:
            item.id,
          quantity:
            item.quantity,
          unit_price:
            item.unit_price,
          product: {
            title:
              item.product.title,
            subtitle:
              item.product.subtitle,
            images:
              item.product.images,
          },
        })
      ),
  });
}
