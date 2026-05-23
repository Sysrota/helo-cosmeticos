import { create }
  from "zustand";

import {
  persist,
} from "zustand/middleware";

export const useCartStore =
  create(

    persist(

      (set) => ({

        items: [],

        // =====================
        // SET ITEMS
        // =====================

        setItems:
          (items) => {

            set({
              items,
            });
          },

        // =====================
        // ADD ITEM
        // =====================

        addItem:
          (item) => {

            set((state) => {

              const existing =
                state.items.find(
                  (product) =>
                    product.product_id ===
                    item.product_id
                );

              if (existing) {

                return {

                  items:
                    state.items.map(
                      (product) => {

                        if (
                          product.product_id ===
                          item.product_id
                        ) {

                          return {

                            ...product,

                            quantity:
                              product.quantity + 1,
                          };
                        }

                        return product;
                      }
                    ),
                };
              }

              return {

                items: [
                  ...state.items,
                  item,
                ],
              };
            });
          },

        // =====================
        // REMOVE ITEM
        // =====================

        removeItem:
          (productId) => {

            set((state) => ({

              items:
                state.items.filter(
                  (item) =>
                    item.product_id !==
                    productId
                ),
            }));
          },

        // =====================
        // CLEAR CART
        // =====================

        clearCart:
          () => {

            set({
              items: [],
            });
          },

        // =====================
        // INCREASE
        // =====================

        increaseQuantity:
          (productId) => {

            set((state) => ({

              items:
                state.items.map(
                  (item) => {

                    if (
                      item.product_id ===
                      productId
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
            }));
          },

        // =====================
        // DECREASE
        // =====================

        decreaseQuantity:
          (productId) => {

            set((state) => ({

              items:
                state.items.map(
                  (item) => {

                    if (
                      item.product_id ===
                      productId
                    ) {

                      return {

                        ...item,

                        quantity:
                          Math.max(
                            1,
                            item.quantity - 1
                          ),
                      };
                    }

                    return item;
                  }
                ),
            }));
          },
      }),

      {
        name:
          "helo-cart",
      }
    )
  );