import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function Layout({
  children,
}) {
  const location =
    useLocation();

  const isCheckout =
    location.pathname === "/checkout" ||
    location.pathname.startsWith("/checkout/");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [location.pathname]);

  return (
    <div
      className="
        bg-helo-soft
        min-h-screen
        flex
        flex-col
      "
    >
      {!isCheckout && <Header />}

      <main className="flex-grow">
        {children}
      </main>

      {!isCheckout && <FloatingWhatsApp />}

      {!isCheckout && <Footer />}
    </div>
  );
}
