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


export default function App() {
  return (
    <BrowserRouter>
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

          <Route path="/checkout/:id" element={<PublicCheckoutPage />}/>


          {/* admin */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/produtos"
            element={
              <PrivateRoute>
                <AdminProdutos />
              </PrivateRoute>
            }
          />

          {/* se alguém entrar em /admin, manda para /admin/produtos */}
          <Route path="/admin" element={<Navigate to="/admin/produtos" replace />} />

          <Route
            path="/admin/attendance"
            element={
              <PrivateRoute>
                <AttendancePage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/clientes"
            element={
              <PrivateRoute>
                <ClientesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/clientes/:id"
            element={
              <PrivateRoute>
                <ClienteDetalhesPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <PrivateRoute>
                <OrdersPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/orders/:id"
            element={
              <PrivateRoute>
                <OrderDetailsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <PrivateRoute>
                <StoreSettingsPage />
              </PrivateRoute>
            }
          />
          

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
