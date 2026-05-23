import {
  Request,
  Response,
} from "express";

import {
  prisma,
} from "../../config/prisma.js";

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
                  item.product_id
              ),
          },
        },
      });

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
                item.product_id
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
              item.product_id,

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
              product: true,
            },
          },
        },
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