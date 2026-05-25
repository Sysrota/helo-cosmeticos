import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";
import { useLocation } from "react-router-dom";

export default function Layout({
  children,
}) {
  const location =
    useLocation();

  const isCheckout =
    location.pathname === "/checkout" ||
    location.pathname.startsWith("/checkout/");

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
