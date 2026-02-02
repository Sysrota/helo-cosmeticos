import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./layout/Layout";
import Home from "./pages/Home";
import Produtos from "./pages/Produtos";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import Produto from "./pages/Produto";
import Carrinho from "./pages/Carrinho";
import Landing from "./pages/Landing";

// admin
import AdminLogin from "./pages/AdminLogin";
import AdminProdutos from "./pages/AdminProdutos";
import PrivateRoute from "./components/PrivateRoute";

import ProdutoDescricao from "./pages/ProdutoDescricao";


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

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
