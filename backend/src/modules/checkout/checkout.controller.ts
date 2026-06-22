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

export async function createCheckoutController(
  req: Request,
  res: Response
) {

  try {

    const {
      customer,
      cart,
      shipping,
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
      await prisma.contact.findFirst({

        where: {

          OR: [

            {
              phone:
                customer.phone,
            },

            {
              email:
                customer.email,
            },
          ],
        },
      });

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

    const order =
      await prisma.order.create({

        data: {

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

    const total =
      Number(order.subtotal) +
      shippingPrice;

    await prisma.contact.update({
      where: {
        id:
          order.contact_id,
      },
      data: {
        name:
          customer.name,
        phone:
          customer.phone,
        email:
          customer.email,
        cpf:
          customer.cpf,
        city:
          customer.city,
        state:
          customer.state,
      },
    });

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
          discount:
            0,
          total,
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
  const orderId =
    Number(
      req.body.order_id
    );
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
    await prisma.order.findUnique({
      where: {
        id:
          orderId,
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
          await prisma.order.findUnique({
            where: {
              id:
                orderId,
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
    total:
      order.total,
    pix_code:
      order.pix_code,
    pix_qrcode:
      order.pix_qrcode,
    shipping_method:
      order.shipping_method,
    shipping_deadline:
      order.shipping_deadline,
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
