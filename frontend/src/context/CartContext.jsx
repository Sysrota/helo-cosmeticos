import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  buildMetaContentIds,
  buildMetaContents,
  trackMetaEvent,
} from "../services/metaPixel";

const CartContext =
  createContext();

export function useCart() {

  return useContext(
    CartContext
  );
}

export function CartProvider({
  children,
}) {

  // =====================
  // STATE
  // =====================

  const [cart, setCart] =
    useState(() => {

      const saved =
        localStorage.getItem(
          "helo_cart"
        );

      if (!saved) {

        return [];
      }

      try {

        return JSON.parse(
          saved
        );

      } catch {

        return [];
      }
    });

  // =====================
  // SAVE STORAGE
  // =====================

  useEffect(() => {

    localStorage.setItem(

      "helo_cart",

      JSON.stringify(cart)
    );

  }, [cart]);

  // =====================
  // ADD ITEM
  // =====================

  const addToCart =
    (product) => {
      const quantity =
        Number(product.quantity || 1);
      const price =
        Number(
          product.price ??
          product.unit_price ??
          0
        );
      const productId =
        product.product_id ??
        product.id;

      trackMetaEvent(
        "AddToCart",
        {
          currency:
            "BRL",
          value:
            Number(
              (
                price *
                quantity
              ).toFixed(2)
            ),
          contents:
            buildMetaContents([
              {
                ...product,
                product_id:
                  productId,
                quantity,
                price,
              },
            ]),
          content_ids:
            buildMetaContentIds([
              {
                ...product,
                product_id:
                  productId,
                quantity,
                price,
              },
            ]),
          content_type:
            "product",
        }
      );

      setCart((prev) => {

        const existing =
          prev.find(
            (item) =>
              (item.product_id ?? item.id) ===
              (product.product_id ?? product.id)
          );

        // =====================
        // INCREASE EXISTING
        // =====================

        if (existing) {

          return prev.map(
            (item) => {

              if (
                (item.product_id ?? item.id) ===
                (product.product_id ?? product.id)
              ) {

                return {

                  ...item,

                  quantity:
                    Number(
                      item.quantity || 1
                    ) + Number(
                      product.quantity || 1
                    ),
                };
              }

              return item;
            }
          );
        }

        // =====================
        // NEW ITEM
        // =====================

        return [

          ...prev,

          {
            ...product,
            product_id:
              product.product_id ??
              product.id,

            quantity:
              Number(
                product.quantity || 1
              ),
          },
        ];
      });
    };

  // =====================
  // REMOVE
  // =====================

  const removeFromCart =
    (index) => {

      setCart((prev) =>

        prev.filter(
          (_, i) =>
            i !== index
        )
      );
    };

  // =====================
  // CLEAR
  // =====================

  const clearCart =
    () => {

      setCart([]);
    };

  // =====================
  // INCREASE
  // =====================

  const increaseQuantity =
    (index) => {

      setCart((prev) =>

        prev.map(
          (item, i) => {

            if (i === index) {

              return {

                ...item,

                quantity:
                  Number(
                    item.quantity || 1
                  ) + 1,
              };
            }

            return item;
          }
        )
      );
    };

  // =====================
  // DECREASE
  // =====================

  const decreaseQuantity =
    (index) => {

      setCart((prev) =>

        prev.map(
          (item, i) => {

            if (
              i === index
            ) {

              return {

                ...item,

                quantity:
                  Math.max(
                    1,
                    Number(
                      item.quantity || 1
                    ) - 1
                  ),
              };
            }

            return item;
          }
        )
      );
    };

  // =====================
  // TOTAL ITEMS
  // =====================

  const totalItems =
    useMemo(() => {

      return cart.reduce(

        (acc, item) => {

          return (
            acc +
            Number(
              item.quantity || 1
            )
          );
        },

        0
      );

    }, [cart]);

  // =====================
  // SUBTOTAL
  // =====================

  const subtotal =
    useMemo(() => {

      return cart.reduce(

        (acc, item) => {

          return (
            acc +
            (
              Number(item.price) *
              Number(
                item.quantity || 1
              )
            )
          );
        },

        0
      );

    }, [cart]);

  // =====================
  // PROVIDER
  // =====================

  return (

    <CartContext.Provider

      value={{

        cart,

        setCart,

        addToCart,

        removeFromCart,

        clearCart,

        increaseQuantity,

        decreaseQuantity,

        subtotal,

        totalItems,
      }}
    >

      {children}

    </CartContext.Provider>
  );
}
