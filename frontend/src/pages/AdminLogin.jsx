import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Falha no login");

      login(data.token);
      nav("/admin/produtos", { replace: true });
    } catch (err) {
      alert(err?.message || "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-helo-background min-h-screen py-20">
      <div className="max-w-md mx-auto px-6">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-display text-helo-dark text-center">Admin</h1>
          <p className="text-center text-helo-text/80 mt-2">Entre para gerenciar os produtos.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              autoComplete="username"
            />

            <input
              className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <button
              disabled={loading}
              className="w-full py-3 bg-helo-dark text-white rounded-xl font-semibold hover:bg-helo-rose transition-all disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
