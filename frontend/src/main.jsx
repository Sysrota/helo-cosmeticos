import React
  from "react";

import ReactDOM
  from "react-dom/client";

import App
  from "./App";

import "./index.css";

import {
  CartProvider,
} from "./context/CartContext";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  loadMercadoPago,
} from "@mercadopago/sdk-js";

async function init() {

  await loadMercadoPago();

  window.mp =
    new MercadoPago(
      import.meta.env
        .VITE_MP_PUBLIC_KEY
    );

  ReactDOM.createRoot(
    document.getElementById(
      "root"
    )
  ).render(

    <>
      <AuthProvider>

        <CartProvider>

          <App />

        </CartProvider>

      </AuthProvider>
    </>
  );
}

init();