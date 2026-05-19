import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const CATEGORIAS = [
  { value: "shampoo", label: "Shampoo" },
  { value: "mascara", label: "Máscara" },
  { value: "leavein", label: "Leave-in" },
  { value: "finalizador", label: "Finalizador" },
  { value: "kit", label: "Kit" },
];

function reaisToNumber(v) {
  const s = String(v ?? "").trim().replace(".", "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminProdutos() {
  const { token, logout } = useAuth(); // ✅ hook tem que ficar aqui dentro

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // filtros do admin
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("true");
  const [sort, setSort] = useState("new");

  // form
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("79,90");
  const [formCategory, setFormCategory] = useState("kit");
  const [isActive, setIsActive] = useState(true);

  const [dicasUso, setDicasUso] = useState("");
  const [oQueVaiSentir, setOQueVaiSentir] = useState("");

  // galeria
  const [gallery, setGallery] = useState([]); // [{id,image_url,sort_order}]
  const [uploadingGallery, setUploadingGallery] = useState(false);

  function authHeadersJson() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  function authHeadersOnly() {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function handle401(res) {
    if (res.status === 401) {
      logout();
      alert("Sessão expirada. Faça login novamente.");
      return true;
    }
    return false;
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        search,
        category,
        sort,
        active,
        limit: "100",
      });

      const res = await fetch(`${API_URL}/products?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductDetails(id) {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (!res.ok) throw new Error("Falha ao carregar produto");
    const data = await res.json();
    setGallery(data.images || []);
    return data;
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload + já adiciona na galeria (somente em edit)
  async function handleUploadToGallery(e) {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    if (!editingId) {
      alert("Crie o produto e clique em Editar antes de adicionar imagens.");
      return;
    }

    setUploadingGallery(true);
    try {
      // 1) upload do arquivo (PROTEGIDO)
      const form = new FormData();
      form.append("file", file);

      const up = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: authHeadersOnly(),
        body: form,
      });

      if (await handle401(up)) return;
      if (!up.ok) throw new Error("Falha no upload");

      const upData = await up.json();

      // 2) vincular na galeria do produto (NÃO cria produto) (PROTEGIDO)
      const nextOrder =
        gallery.length > 0
          ? Math.max(...gallery.map((g) => Number(g.sort_order) || 0)) + 1
          : 0;

      const add = await fetch(`${API_URL}/products/${editingId}/images`, {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({ image_url: upData.image_url, sort_order: nextOrder }),
      });

      if (await handle401(add)) return;

      if (!add.ok) {
        const err = await add.json().catch(() => ({}));
        console.log("Erro add image:", err);
        throw new Error("Falha ao vincular imagem na galeria");
      }

      await fetchProductDetails(editingId);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar imagem na galeria.");
    } finally {
      setUploadingGallery(false);
    }
  }

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPrice("79,90");
    setFormCategory("kit");
    setIsActive(true);
    setGallery([]);
    setDicasUso("");
    setOQueVaiSentir("");
  }

  async function fillForm(p) {
    setMode("edit");
    setEditingId(p.id);
    setTitle(p.title || "");
    setDescription(p.description || "");
    setPrice(String(p.price ?? 0).replace(".", ","));
    setFormCategory(p.category || "kit");
    setIsActive(Boolean(p.is_active));

    // se a listagem vier sem os campos, tentamos pelo menos popular com fallback
    setDicasUso(p.dicas_uso || "");
    setOQueVaiSentir(p.o_que_vai_sentir || "");

    setGallery([]);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // carrega detalhes (inclui galeria e pode incluir campos completos)
    try {
      const full = await fetchProductDetails(p.id);
      setDicasUso(full.dicas_uso || p.dicas_uso || "");
      setOQueVaiSentir(full.o_que_vai_sentir || p.o_que_vai_sentir || "");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      title,
      description,
      price: reaisToNumber(price),
      category: formCategory,
      is_active: isActive,
      dicas_uso: dicasUso,
      o_que_vai_sentir: oQueVaiSentir,
    };

    const isEdit = mode === "edit" && editingId != null;
    const url = isEdit ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeadersJson(),
      body: JSON.stringify(payload),
    });

    if (await handle401(res)) return;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Erro ao salvar produto. Veja o console.");
      console.log("Erro:", err);
      return;
    }

    resetForm();
    await fetchProducts();
  }

  async function handleDelete(id) {
    const ok = confirm("Tem certeza que deseja excluir este produto?");
    if (!ok) return;

    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: authHeadersOnly(),
    });

    if (await handle401(res)) return;

    if (!res.ok) {
      alert("Erro ao excluir.");
      return;
    }

    await fetchProducts();
    if (editingId === id) resetForm();
  }

  async function toggleActive(p) {
    const res = await fetch(`${API_URL}/products/${p.id}`, {
      method: "PUT",
      headers: authHeadersJson(),
      body: JSON.stringify({ is_active: !p.is_active }),
    });

    if (await handle401(res)) return;

    if (!res.ok) {
      alert("Erro ao alterar status.");
      return;
    }

    await fetchProducts();
    if (editingId === p.id) await fetchProductDetails(p.id);
  }

  async function setAsCover(img) {
    if (!editingId) return;

    const sorted = [...gallery].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const updates = [];

    // set cover sort_order = 0
    updates.push(
      fetch(`${API_URL}/products/${editingId}/images/${img.id}`, {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify({ sort_order: 0 }),
      })
    );

    // push others
    let order = 1;
    for (const g of sorted) {
      if (g.id === img.id) continue;
      updates.push(
        fetch(`${API_URL}/products/${editingId}/images/${g.id}`, {
          method: "PUT",
          headers: authHeadersJson(),
          body: JSON.stringify({ sort_order: order++ }),
        })
      );
    }

    const results = await Promise.allSettled(updates);
    // se algum retornou 401, desloga
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (await handle401(r.value)) return;
      }
    }

    await fetchProductDetails(editingId);
    await fetchProducts();
  }

  async function removeImage(img) {
    if (!editingId) return;

    const ok = confirm("Remover esta imagem da galeria?");
    if (!ok) return;

    const res = await fetch(`${API_URL}/products/${editingId}/images/${img.id}`, {
      method: "DELETE",
      headers: authHeadersOnly(),
    });

    if (await handle401(res)) return;

    if (!res.ok) {
      alert("Erro ao remover imagem.");
      return;
    }

    await fetchProductDetails(editingId);
    await fetchProducts();
  }

  return (
    <div className="bg-helo-background min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display text-helo-dark">Admin • Produtos</h1>
          <p className="mt-2 text-helo-text/80 font-body">
            Cadastre e gerencie os produtos da Helô Cosméticos.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-6 md:p-8 mb-10">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
            <div>
              <h2 className="text-2xl font-display text-helo-dark">
                {mode === "edit" ? "Editar produto" : "Cadastrar produto"}
              </h2>
              <p className="text-helo-text/80 font-body mt-1">Preencha os dados e salve.</p>
            </div>

            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl bg-white text-helo-dark border border-helo-dark/20 hover:shadow"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-helo-dark mb-2">Título</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-helo-rose/40"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Kit Forte Liso 3 Passos"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-helo-dark mb-2">Categoria</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                required
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-helo-dark mb-2">
                Preço (R$)
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="79,90"
                required
              />
            </div>

            <div className="flex items-center gap-3 mt-6 md:mt-0">
              <input
                id="ativo"
                type="checkbox"
                className="w-5 h-5"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="ativo" className="text-helo-text/90 font-body">
                Produto ativo (aparece na loja)
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-helo-dark mb-2">
                Descrição
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white min-h-[110px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição curta e objetiva do produto."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-helo-dark mb-2">
                Dicas de uso
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white min-h-[110px]"
                value={dicasUso}
                onChange={(e) => setDicasUso(e.target.value)}
                placeholder="Ex: Aplique uma pequena quantidade, massageie e enxágue..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-helo-dark mb-2">
                O que você vai sentir (1 item por linha)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-helo-dark/10 bg-white min-h-[110px]"
                value={oQueVaiSentir}
                onChange={(e) => setOQueVaiSentir(e.target.value)}
                placeholder={`Ex:\nTextura agradável e aplicação fácil\nAcabamento mais alinhado e macio\nRotina prática no dia a dia`}
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-8 py-3 bg-helo-dark text-white rounded-xl font-semibold shadow-md hover:bg-helo-rose transition-all"
              >
                {mode === "edit" ? "Salvar alterações" : "Cadastrar produto"}
              </button>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-helo-dark mb-2">
                  Galeria (várias imagens)
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!editingId}
                    onChange={handleUploadToGallery}
                    className="block w-full text-sm disabled:opacity-50"
                  />
                  {uploadingGallery && (
                    <span className="text-sm text-helo-text/80">Enviando...</span>
                  )}
                </div>

                {!editingId && (
                  <p className="text-xs text-helo-text/70 mt-2">
                    * Para adicionar imagens, primeiro crie o produto e clique em “Editar”.
                  </p>
                )}
              </div>
            </div>
          </form>

          {/* Galeria */}
          {mode === "edit" && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-display text-helo-dark">Galeria do produto</h3>
                <div className="text-sm text-helo-text/70">Capa = Ordem 0</div>
              </div>

              {gallery.length === 0 ? (
                <div className="text-helo-text/70 bg-white/50 border border-white/40 rounded-2xl p-4">
                  Nenhuma imagem na galeria ainda. Faça upload acima.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...gallery]
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((g) => (
                      <div
                        key={g.id}
                        className="bg-white/70 border border-white/40 rounded-2xl shadow overflow-hidden"
                      >
                        <div className="w-full h-36 bg-helo-background overflow-hidden">
                          <img
                            src={`${API_URL}${g.image_url}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                          <div className="text-xs text-helo-text/70">
                            Ordem: <span className="font-semibold">{g.sort_order}</span>
                            {g.sort_order === 0 ? " • Capa" : ""}
                          </div>

                          <button
                            type="button"
                            onClick={() => setAsCover(g)}
                            className="px-3 py-2 rounded-xl bg-white border border-helo-dark/10 text-helo-dark hover:shadow"
                          >
                            Definir capa
                          </button>

                          <button
                            type="button"
                            onClick={() => removeImage(g)}
                            className="px-3 py-2 rounded-xl bg-red-600 text-white hover:opacity-90"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtros do admin */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-5 md:p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <input
              className="px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Todas categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              className="px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            >
              <option value="true">Somente ativos</option>
              <option value="false">Somente inativos</option>
            </select>

            <div className="flex gap-3">
              <select
                className="flex-1 px-4 py-3 rounded-xl border border-helo-dark/10 bg-white"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="new">Mais novos</option>
                <option value="low">Menor preço</option>
                <option value="high">Maior preço</option>
              </select>

              <button
                onClick={fetchProducts}
                className="px-6 py-3 rounded-xl bg-helo-dark text-white font-semibold hover:bg-helo-rose transition-all"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display text-helo-dark">Produtos cadastrados</h2>
            <div className="text-helo-text/80 font-body">
              {loading ? "Carregando..." : `${items.length} item(s)`}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {items.map((p) => (
              <div
                key={p.id}
                className="bg-white/70 border border-white/40 rounded-2xl shadow p-4 flex gap-4"
              >
                <div className="w-24 h-28 rounded-xl overflow-hidden bg-helo-background flex-shrink-0">
                  {p.image_url ? (
                    <img
                      src={`${API_URL}${p.image_url}`}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg text-helo-dark">{p.title}</div>
                      <div className="text-sm text-helo-text/80">
                        Categoria: <span className="font-semibold">{p.category}</span>
                      </div>
                      <div className="text-sm text-helo-text/80 mt-1">
                        Preço:{" "}
                        <span className="font-semibold">R$ {Number(p.price).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-helo-text/70 mt-1">
                        Status: {p.is_active ? "Ativo" : "Inativo"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => fillForm(p)}
                        className="px-3 py-2 rounded-xl bg-white border border-helo-dark/10 text-helo-dark hover:shadow"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(p)}
                        className="px-3 py-2 rounded-xl bg-white border border-helo-dark/10 text-helo-dark hover:shadow"
                      >
                        {p.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-3 py-2 rounded-xl bg-red-600 text-white hover:opacity-90"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {p.description ? (
                    <p className="text-sm text-helo-text/80 mt-3 line-clamp-3">
                      {p.description}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {!loading && items.length === 0 ? (
            <div className="text-center text-helo-text/70 py-10">Nenhum produto encontrado.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
