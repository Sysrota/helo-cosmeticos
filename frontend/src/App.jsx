import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./layout/Layout";
import Carrinho from "./pages/Carrinho";
import Contato from "./pages/Contato";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Produto from "./pages/Produto";
import Produtos from "./pages/Produtos";
import Sobre from "./pages/Sobre";

// admin
import PrivateRoute from "./components/PrivateRoute";
import AdminLogin from "./pages/AdminLogin";
import AdminProdutos from "./pages/AdminProdutos";

import { AttendancePage } from "./modules/attendance/pages/AttendancePage";
import ProdutoDescricao from "./pages/ProdutoDescricao";
import ClienteDetalhesPage from "./pages/clientes/[id]";
import OrdersPage from "./pages/orders/OrdersPage";
import ClientesPage from "./pages/clientes/Clientes";
import OrderDetailsPage from "./pages/orders/OrderDetailsPage";
import StoreSettingsPage from "./pages/settings/StoreSettingsPage";
import AiCartPage from "./pages/AiCartPage";
import PublicCheckoutPage from "./pages/PublicCheckoutPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import AdminLayout from "./components/admin/AdminLayout";
import { CommercialPolicyProvider } from "./context/CommercialPolicyContext";


export default function App() {
  return (
    <BrowserRouter>
      <CommercialPolicyProvider>
        <Layout>
          <Routes>
          {/* públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/produto/:id" element={<Produto />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/lp-kit-forte-liso" element={<Landing />} />
          <Route path="/produto-descricao/:id" element={<ProdutoDescricao />} />
          <Route path="/carrinho-ai/:token" element={<AiCartPage />}/>

          <Route path="/checkout" element={<PublicCheckoutPage />}/>
          <Route path="/checkout/:id" element={<PublicCheckoutPage />}/>
          <Route path="/acompanhar-pedido" element={<OrderTrackingPage />}/>


          {/* admin */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="produtos" replace />} />
            <Route path="produtos" element={<AdminProdutos />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/:id" element={<ClienteDetalhesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="settings" element={<StoreSettingsPage />} />
          </Route>
          

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </CommercialPolicyProvider>
    </BrowserRouter>
  );
}
