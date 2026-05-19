import Header from "../components/Header";
import Footer from "../components/Footer";
import FloatingWhatsApp from "../components/FloatingWhatsApp";

export default function Layout({ children }) {
  return (
    <div className="bg-helo-soft min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
        {/* Botão flutuante */}
      <FloatingWhatsApp />
      <Footer />
    </div>
  );
}
