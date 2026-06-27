import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const CATEGORIAS = [
  { value: "shampoo", label: "Shampoo" },
  { value: "condicionador", label: "Condicionador" },
  { value: "mascara", label: "Máscara Capilar" },
  { value: "redutor", label: "Redutor de Volume" },
  { value: "skincare", label: "Skincare " },
  { value: "finalizador", label: "Finalizador" },
  { value: "kit", label: "Kit" },
];

function reaisToNumber(v) {
  const s = String(v ?? "").trim().replace(".", "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function numberToReais(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function roundCommercialPrice(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  let rounded = Math.ceil(value) - 0.1;
  if (rounded < value) rounded += 1;
  return Number(rounded.toFixed(2));
}

const DEFAULT_PRICING = {
  lot_quantity: 0,
  production_cost_total: 0,
  packaging_cost_total: 0,
  labels_cost_total: 0,
  shipping_materials_cost_total: 0,
  factory_freight_cost_total: 0,
  payment_fee_percent: 0,
  sales_tax_percent: 0,
  company_shipping_cost_avg: 0,
  customer_acquisition_cost_avg: 0,
  desired_profit_margin_percent: 0,
};

function extractPricing(product = {}) {
  return Object.keys(DEFAULT_PRICING).reduce((acc, key) => {
    acc[key] = Number(product[key] ?? DEFAULT_PRICING[key]) || 0;
    return acc;
  }, {});
}

export default function AdminProdutos() {
  const { token, logout } = useAuth(); // ✅ hook tem que ficar aqui dentro

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  // filtros do admin
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState("true");
  const [sort, setSort] = useState("display");
  const [tagsIA, setTagsIA] = useState("");
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [dragOverProductId, setDragOverProductId] = useState(null);
  const [savingProductOrder, setSavingProductOrder] = useState(false);

  // form
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);
  const [productTab, setProductTab] = useState("details");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [formCategory, setFormCategory] = useState("Selecione");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const [dicasUso, setDicasUso] = useState("");
  const [oQueVaiSentir, setOQueVaiSentir] = useState("");
  const [destaques, setDestaques] = useState("");
  const [composicao, setComposicao] = useState("");

  // galeria
  const [gallery, setGallery] = useState([]); // [{id,image_url,sort_order}]
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState(null);
  const [dragOverImageId, setDragOverImageId] = useState(null);
  const [savingGalleryOrder, setSavingGalleryOrder] = useState(false);

    // dimensões para frete

    const [weight, setWeight] =
      useState(0);

    const [height, setHeight] =
      useState(0);

    const [width, setWidth] =
      useState(0);

  const [length, setLength] =
      useState(0);

  const [pricing, setPricing] = useState({ ...DEFAULT_PRICING });

  const pricingResult = useMemo(() => {
    const productionTotal =
      pricing.production_cost_total +
      pricing.packaging_cost_total +
      pricing.labels_cost_total +
      pricing.shipping_materials_cost_total +
      pricing.factory_freight_cost_total;

    const unitProductionCost =
      pricing.lot_quantity > 0
        ? productionTotal / pricing.lot_quantity
        : 0;

    const fixedCostPerSale =
      unitProductionCost +
      pricing.company_shipping_cost_avg +
      pricing.customer_acquisition_cost_avg;

    const variablePercent =
      (pricing.payment_fee_percent +
        pricing.sales_tax_percent +
        pricing.desired_profit_margin_percent) /
      100;

    const minimumSuggestedPrice =
      variablePercent < 1
        ? fixedCostPerSale / (1 - variablePercent)
        : 0;

    const commercialSuggestedPrice = roundCommercialPrice(
      minimumSuggestedPrice
    );

    const currentPrice = reaisToNumber(price);
    const currentPaymentFee =
      currentPrice * (pricing.payment_fee_percent / 100);
    const currentSalesTax =
      currentPrice * (pricing.sales_tax_percent / 100);
    const estimatedCost =
      fixedCostPerSale + currentPaymentFee + currentSalesTax;
    const estimatedProfit = currentPrice - estimatedCost;
    const realMargin =
      currentPrice > 0
        ? (estimatedProfit / currentPrice) * 100
        : 0;

    return {
      productionTotal,
      unitProductionCost,
      fixedCostPerSale,
      variablePercent,
      minimumSuggestedPrice,
      commercialSuggestedPrice,
      currentPrice,
      estimatedCost,
      estimatedProfit,
      realMargin,
    };
  }, [price, pricing]);

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

  function setPricingField(field, value) {
    setPricing((current) => ({
      ...current,
      [field]: Number(value) || 0,
    }));
  }

  async function handle401(res) {
    if (res.status === 401) {
      logout();
      alert("Sessão expirada. Faça login novamente.");
      return true;
    }
    return false;
  }

  function canReorderProducts() {
    return (
      sort === "display" &&
      active === "true" &&
      category === "all" &&
      !search.trim()
    );
  }

  function getOrderedProducts(products = items) {
    return [...products].sort(
      (a, b) =>
        (a.sort_order ?? 0) -
          (b.sort_order ?? 0) ||
        b.id - a.id
    );
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
    setSubtitle("");
    setMetaDescription("");
    setDescription("");
    setPrice("0,00");
    setFormCategory("");
    setIsActive(true);
    setIsFeatured(false);
    setGallery([]);
    setDicasUso("");
    setOQueVaiSentir("");
    setComposicao("");
    setTagsIA("");
    setWeight(0);
    setHeight(0);
    setWidth(0);
    setLength(0);
    setPricing({ ...DEFAULT_PRICING });
    setProductTab("details");
  }

  async function fillForm(p) {
    setMode("edit");
    setEditingId(p.id);
    setProductTab("details");
    setTitle(p.title || "");
    setSubtitle(p.subtitle || "");
    setMetaDescription(p.meta_description || "");
    setDescription(p.description || "");
    setPrice(String(p.price ?? 0).replace(".", ","));
    setFormCategory(p.category || "");
    setIsActive(Boolean(p.is_active));
    setIsFeatured(Boolean(p.is_featured));
    setTagsIA(p.keywords || "");
    // se a listagem vier sem os campos, tentamos pelo menos popular com fallback
    setDicasUso(p.dicas_uso || "");
    setOQueVaiSentir(p.o_que_vai_sentir || "");
    setDestaques(p.destaques || "");
    setComposicao(p.composicao || "");

    setWeight(p.weight || 0);
    setHeight(p.height || 0);
    setWidth(p.width || 0);
    setLength(p.length || 0);
    setPricing(extractPricing(p));


    setGallery([]);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // carrega detalhes (inclui galeria e pode incluir campos completos)
    try {
      const full = await fetchProductDetails(p.id);
      setSubtitle(full.subtitle || p.subtitle || "");
      setMetaDescription(full.meta_description || p.meta_description || "");
      setDicasUso(full.dicas_uso || p.dicas_uso || "");
      setOQueVaiSentir(full.o_que_vai_sentir || p.o_que_vai_sentir || "");
      setDestaques(full.destaques || p.destaques || "");
      setComposicao(full.composicao || p.composicao || "");
      setPricing(extractPricing(full));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

  const payload = {
    title,
    subtitle,
    meta_description: metaDescription,
    description,
    price: reaisToNumber(price),
    category: formCategory,
    is_active: isActive,
    is_featured: isFeatured,
    dicas_uso: dicasUso,
    o_que_vai_sentir: oQueVaiSentir,
    destaques,
    composicao,
    keywords: tagsIA,
    weight,
    height,
    width,
    length,
    ...pricing,
    lot_quantity: Math.floor(Number(pricing.lot_quantity) || 0),
  };

  console.log("Payload para salvar:", payload);

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

  async function saveProductOrder(nextProducts) {
    if (!canReorderProducts()) {
      return;
    }

    const orderedProducts =
      nextProducts.map((product, index) => ({
        ...product,
        sort_order: index,
      }));

    setItems(orderedProducts);
    setSavingProductOrder(true);

    try {
      const res =
        await fetch(`${API_URL}/products/order`, {
          method: "PUT",
          headers: authHeadersJson(),
          body: JSON.stringify({
            items:
              orderedProducts.map((product) => ({
                id: product.id,
                sort_order: product.sort_order,
              })),
          }),
        });

      if (await handle401(res)) return;

      if (!res.ok) {
        throw new Error("Falha ao salvar ordem dos produtos");
      }

      await fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar a ordem dos produtos.");
      await fetchProducts();
    } finally {
      setSavingProductOrder(false);
    }
  }

  async function handleProductDrop(event, targetProduct) {
    event.preventDefault();

    if (!canReorderProducts()) {
      return;
    }

    const draggedId =
      Number(
        event.dataTransfer.getData(
          "text/plain"
        )
      ) || draggedProductId;

    setDraggedProductId(null);
    setDragOverProductId(null);

    if (
      !draggedId ||
      draggedId === targetProduct.id
    ) {
      return;
    }

    const orderedProducts =
      getOrderedProducts();
    const fromIndex =
      orderedProducts.findIndex(
        (product) =>
          product.id === draggedId
      );
    const toIndex =
      orderedProducts.findIndex(
        (product) =>
          product.id === targetProduct.id
      );

    if (
      fromIndex < 0 ||
      toIndex < 0
    ) {
      return;
    }

    const nextProducts =
      [...orderedProducts];
    const [movedProduct] =
      nextProducts.splice(
        fromIndex,
        1
      );

    nextProducts.splice(
      toIndex,
      0,
      movedProduct
    );

    await saveProductOrder(
      nextProducts
    );
  }

  async function setAsCover(img) {
    if (!editingId) return;

    const sorted = getSortedGallery();
    const nextGallery = [
      img,
      ...sorted.filter((g) => g.id !== img.id),
    ];

    await saveGalleryOrder(nextGallery);
  }

  function getSortedGallery(items = gallery) {
    return [...items].sort(
      (a, b) =>
        (a.sort_order ?? 0) -
        (b.sort_order ?? 0)
    );
  }

  async function saveGalleryOrder(nextGallery) {
    if (!editingId) return;

    const orderedGallery =
      nextGallery.map((image, index) => ({
        ...image,
        sort_order: index,
      }));

    setGallery(orderedGallery);
    setSavingGalleryOrder(true);

    try {
      const results =
        await Promise.allSettled(
          orderedGallery.map((image) =>
            fetch(
              `${API_URL}/products/${editingId}/images/${image.id}`,
              {
                method: "PUT",
                headers: authHeadersJson(),
                body: JSON.stringify({
                  sort_order:
                    image.sort_order,
                }),
              }
            )
          )
        );

      for (const result of results) {
        if (result.status === "rejected") {
          throw result.reason;
        }

        if (await handle401(result.value)) {
          return;
        }

        if (!result.value.ok) {
          throw new Error(
            "Falha ao salvar ordem da galeria"
          );
        }
      }

      await fetchProductDetails(editingId);
      await fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar a ordem das imagens.");
      await fetchProductDetails(editingId);
    } finally {
      setSavingGalleryOrder(false);
    }
  }

  async function handleGalleryDrop(event, targetImage) {
    event.preventDefault();

    const draggedId =
      Number(
        event.dataTransfer.getData(
          "text/plain"
        )
      ) || draggedImageId;

    setDraggedImageId(null);
    setDragOverImageId(null);

    if (
      !draggedId ||
      draggedId === targetImage.id
    ) {
      return;
    }

    const sorted =
      getSortedGallery();
    const fromIndex =
      sorted.findIndex(
        (image) =>
          image.id === draggedId
      );
    const toIndex =
      sorted.findIndex(
        (image) =>
          image.id === targetImage.id
      );

    if (
      fromIndex < 0 ||
      toIndex < 0
    ) {
      return;
    }

    const nextGallery =
      [...sorted];
    const [movedImage] =
      nextGallery.splice(
        fromIndex,
        1
      );

    nextGallery.splice(
      toIndex,
      0,
      movedImage
    );

    await saveGalleryOrder(
      nextGallery
    );
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
    <div className="bg-helo-background min-h-screen py-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* <div className="text-center mb-10">
          <h1 className="text-4xl font-display text-helo-dark">Admin • Produtos</h1>
          <p className="mt-2 text-helo-text/80 font-body">
            Cadastre e gerencie os produtos da Helô Cosméticos.
          </p>
        </div> */}

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

<form
  onSubmit={handleSubmit}

  className="
    mt-6
    flex
    flex-col
    gap-6
  "
>

  <div className="inline-flex w-full max-w-md rounded-2xl bg-zinc-100 p-1">
    <button
      type="button"
      onClick={() => setProductTab("details")}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        productTab === "details"
          ? "bg-white text-helo-dark shadow-sm"
          : "text-zinc-500"
      }`}
    >
      Dados do produto
    </button>

    <button
      type="button"
      onClick={() => setProductTab("pricing")}
      className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        productTab === "pricing"
          ? "bg-white text-helo-dark shadow-sm"
          : "text-zinc-500"
      }`}
    >
      Preço e custos
    </button>
  </div>

  {productTab === "details" && (
    <>

  {/* ========================= */}
  {/* DADOS PRINCIPAIS */}
  {/* ========================= */}

  <div className="
    bg-zinc-50
    border
    rounded-2xl
    p-5
  ">

    <div className="
      flex
      items-center
      justify-between
      mb-5
    ">
      <div>
        <h3 className="
          text-lg
          font-semibold
          text-helo-dark
        ">
          Dados principais
        </h3>

        <p className="
          text-sm
          text-zinc-500
        ">
          Informações básicas do produto
        </p>
      </div>
    </div>

    <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      gap-5
    ">

      {/* TITULO */}
      <div className="md:col-span-2">
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Título
        </label>

        <input
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
          "

          value={title}

          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }

          placeholder="Ex: Kit PrimeSkin"
          required
        />
      </div>

      {/* SUBTÍTULO */}
      <div className="md:col-span-2">
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Subtítulo para venda
        </label>

        <input
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
          "

          value={subtitle}

          onChange={(e) =>
            setSubtitle(
              e.target.value
            )
          }

          placeholder="Ex: Rotina completa para pele mais hidratada e iluminada."
          maxLength={160}
        />
      </div>

      {/* META DESCRIÇÃO SEO */}
      <div className="md:col-span-2">
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Meta descrição SEO
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[90px]
          "

          value={metaDescription}

          onChange={(e) =>
            setMetaDescription(
              e.target.value
            )
          }

          placeholder="Texto curto para Google e compartilhamento. Ex: Hidratante facial PrimeSkin para pele macia, iluminada e confortável."
          maxLength={180}
        />

        <p className="mt-1 text-xs text-zinc-500">
          {metaDescription.length}/180 caracteres
        </p>
      </div>

      {/* CATEGORIA */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Categoria
        </label>

        <select
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
          "

          value={formCategory}

          onChange={(e) =>
            setFormCategory(
              e.target.value
            )
          }

          required
        >
          <option value="">
            Selecione
          </option>

          {CATEGORIAS.map((c) => (
            <option
              key={c.value}
              value={c.value}
            >
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* PREÇO */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Preço
        </label>

        <input
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
          "

          value={price}

          onChange={(e) =>
            setPrice(
              e.target.value
            )
          }

          placeholder="0,00"
          required
        />
      </div>

      {/* STATUS */}
      <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
        <label
          htmlFor="ativo"
          className="flex items-center gap-3 rounded-xl border border-helo-dark/10 bg-white px-4 py-3 text-sm text-zinc-700"
        >

        <input
          id="ativo"
          type="checkbox"

          className="
            w-5
            h-5
          "

          checked={isActive}

          onChange={(e) =>
            setIsActive(
              e.target.checked
            )
          }
        />

          Produto ativo
        </label>

        <label
          htmlFor="destaque"
          className="flex items-start gap-3 rounded-xl border border-[#efd8de] bg-[#fff7f9] px-4 py-3 text-sm text-zinc-700"
        >
          <input
            id="destaque"
            type="checkbox"
            className="mt-0.5 h-5 w-5"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <span>
            <span className="block font-semibold text-helo-dark">
              Destacar na home
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Substitui o produto principal atual.
            </span>
          </span>
        </label>
      </div>

      {/* DESCRIÇÃO */}
      <div className="md:col-span-2">
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Descrição
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[120px]
          "

          value={description}

          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }

          placeholder="Descrição do produto. Ex: Promove **hidratação profunda** e sensação de pele macia."
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use **texto** para negrito, *texto* para itálico e linhas começando com - para listas.
        </p>
      </div>
    </div>
  </div>

  {/* ========================= */}
  {/* EXPERIÊNCIA */}
  {/* ========================= */}

  <div className="
    bg-zinc-50
    border
    rounded-2xl
    p-5
  ">

    <div className="mb-5">
      <h3 className="
        text-lg
        font-semibold
        text-helo-dark
      ">
        Experiência do cliente
      </h3>

      <p className="
        text-sm
        text-zinc-500
      ">
        Informações usadas pela IA e vendas
      </p>
    </div>

    <div className="
      flex
      flex-col
      gap-5
    ">

      {/* DICAS */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Dicas de uso
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[110px]
          "

          value={dicasUso}

          onChange={(e) =>
            setDicasUso(
              e.target.value
            )
          }
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use **texto** para destacar palavras importantes.
        </p>
      </div>

      {/* DESTAQUES COMERCIAIS */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Destaques comerciais
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[100px]
          "
          placeholder={"Frete grátis\nNecessaire inclusa\n3x sem juros\nCompra segura"}
          value={destaques}
          onChange={(e) => setDestaques(e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Um destaque por linha. Exibidos como badges próximos ao preço na página do produto. Deixe vazio para não exibir nenhum badge.
        </p>
      </div>

      {/* O QUE VAI SENTIR */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          O que o cliente vai sentir
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[110px]
          "

          value={oQueVaiSentir}

          onChange={(e) =>
            setOQueVaiSentir(
              e.target.value
            )
          }
        />
        <p className="mt-1 text-xs text-zinc-500">
          Uma sensação por linha. Use **texto** para negrito.
        </p>
      </div>

      {/* COMPOSIÇÃO / ATIVOS PRINCIPAIS */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Composição / Ativos principais
        </label>

        <textarea
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
            min-h-[100px]
          "
          placeholder="Niacinamida, Trealose, Manteiga de Cupuaçu, Extrato de Flor de Lótus..."
          value={composicao}
          onChange={(e) => setComposicao(e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Ingredientes e ativos do produto. A IA usa quando o cliente perguntar sobre fórmula, composição ou compatibilidade com tipo de pele.
        </p>
      </div>

      {/* TAGS IA */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-helo-dark
          mb-2
        ">
          Tags para IA
        </label>

        <input
          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
            border-helo-dark/10
            bg-white
          "

          value={tagsIA}

          onChange={(e) =>
            setTagsIA(
              e.target.value
            )
          }

          placeholder="hidratação, skincare, pele..."
        />
      </div>
    </div>
  </div>

  {/* ========================= */}
  {/* FRETE */}
  {/* ========================= */}

  <div className="
    bg-zinc-50
    border
    rounded-2xl
    p-5
  ">

    <div className="mb-5">
      <h3 className="
        text-lg
        font-semibold
        text-helo-dark
      ">
        Frete e logística
      </h3>

      <p className="
        text-sm
        text-zinc-500
      ">
        Usado no cálculo automático de frete
      </p>
    </div>

    <div className="
      grid
      grid-cols-2
      md:grid-cols-4
      gap-4
    ">

      <div>
        <label className="
          block
          text-sm
          mb-2
        ">
          Peso (kg)
        </label>

        <input
          type="number"

          step="0.01"

          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
          "

          value={weight}

          onChange={(e) =>
            setWeight(
              Number(
                e.target.value
              )
            )
          }
        />
      </div>

      <div>
        <label className="
          block
          text-sm
          mb-2
        ">
          Altura
        </label>

        <input
          type="number"

          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
          "

          value={height}

          onChange={(e) =>
            setHeight(
              Number(
                e.target.value
              )
            )
          }
        />
      </div>

      <div>
        <label className="
          block
          text-sm
          mb-2
        ">
          Largura
        </label>

        <input
          type="number"

          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
          "

          value={width}

          onChange={(e) =>
            setWidth(
              Number(
                e.target.value
              )
            )
          }
        />
      </div>

      <div>
        <label className="
          block
          text-sm
          mb-2
        ">
          Comprimento
        </label>

        <input
          type="number"

          className="
            w-full
            px-4
            py-3
            rounded-xl
            border
          "

          value={length}

          onChange={(e) =>
            setLength(
              Number(
                e.target.value
              )
            )
          }
        />
      </div>
    </div>
  </div>

  {/* ========================= */}
  {/* GALERIA */}
  {/* ========================= */}

  <div className="
    bg-zinc-50
    border
    rounded-2xl
    p-5
  ">

    <div className="
      flex
      items-center
      justify-between
      mb-5
      gap-4
      flex-wrap
    ">

      <div>
        <h3 className="
          text-lg
          font-semibold
          text-helo-dark
        ">
          Galeria do produto
        </h3>

        <p className="
          text-sm
          text-zinc-500
        ">
          Arraste as imagens para organizar a ordem de exibição. A primeira imagem será a capa.
        </p>
      </div>

      <input
        type="file"

        accept="
          image/png,
          image/jpeg,
          image/webp
        "

        disabled={!editingId || uploadingGallery}

        onChange={
          handleUploadToGallery
        }

        className="
          text-sm
          max-w-full
        "
      />
      {uploadingGallery && (
        <span className="text-sm font-medium text-helo-dark">
          Enviando imagem...
        </span>
      )}
      {savingGalleryOrder && (
        <span className="text-sm font-medium text-helo-dark">
          Salvando ordem...
        </span>
      )}
    </div>

    {!editingId && (
      <div className="
        text-sm
        text-zinc-500
        mb-4
      ">
        Salve o produto primeiro para adicionar imagens.
      </div>
    )}

    {editingId && gallery.length === 0 && (
      <div className="
        text-sm
        text-zinc-500
        rounded-xl
        border
        border-dashed
        border-zinc-300
        bg-white
        p-4
      ">
        Nenhuma imagem na galeria ainda. Faça upload acima.
      </div>
    )}

    {gallery.length > 0 && (
      <div className="
        grid
        grid-cols-2
        md:grid-cols-4
        gap-4
      ">

        {getSortedGallery()
          .map((g) => (

            <div
              key={g.id}
              draggable={!savingGalleryOrder}
              onDragStart={(event) => {
                setDraggedImageId(g.id);
                event.dataTransfer.effectAllowed =
                  "move";
                event.dataTransfer.setData(
                  "text/plain",
                  String(g.id)
                );
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect =
                  "move";
                setDragOverImageId(g.id);
              }}
              onDragLeave={() => {
                setDragOverImageId((current) =>
                  current === g.id
                    ? null
                    : current
                );
              }}
              onDrop={(event) =>
                handleGalleryDrop(
                  event,
                  g
                )
              }
              onDragEnd={() => {
                setDraggedImageId(null);
                setDragOverImageId(null);
              }}

              className={`
                bg-white
                border
                rounded-2xl
                overflow-hidden
                transition
                cursor-grab
                active:cursor-grabbing
                ${draggedImageId === g.id
                  ? "opacity-50"
                  : ""}
                ${dragOverImageId === g.id
                  ? "border-helo-dark ring-2 ring-helo-dark/15"
                  : ""}
              `}
            >

              <div className="
                h-40
                overflow-hidden
                relative
              ">
                <div className="
                  absolute
                  left-2
                  top-2
                  z-10
                  rounded-full
                  bg-white/90
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  text-helo-dark
                  shadow-sm
                ">
                  Ordem {g.sort_order ?? 0}
                  {(g.sort_order ?? 0) === 0
                    ? " • Capa"
                    : ""}
                </div>
                <img
                  src={`${API_URL}${g.image_url}`}

                  alt=""

                  className="
                    w-full
                    h-full
                    object-cover
                    pointer-events-none
                  "
                />
              </div>

              <div className="
                p-3
                flex
                flex-col
                gap-2
              ">
                <div className="
                  rounded-xl
                  border
                  border-dashed
                  border-zinc-200
                  bg-zinc-50
                  px-3
                  py-2
                  text-center
                  text-xs
                  font-medium
                  text-zinc-500
                ">
                  Arraste para mudar posição
                </div>

                <button
                  type="button"

                  onClick={() =>
                    setAsCover(g)
                  }

                  className="
                    px-3
                    py-2
                    rounded-xl
                    border
                  "
                >
                  Definir capa
                </button>

                <button
                  type="button"

                  onClick={() =>
                    removeImage(g)
                  }

                  className="
                    px-3
                    py-2
                    rounded-xl
                    bg-red-600
                    text-white
                  "
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
      </div>
    )}
  </div>

    </>
  )}

  {productTab === "pricing" && (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <div className="rounded-2xl border bg-zinc-50 p-5">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-helo-dark">
                Custos de produção do lote
              </h3>
              <p className="text-sm text-zinc-500">
                Valores totais pagos para fabricar este produto.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Quantidade produzida
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.lot_quantity}
                  onChange={(e) =>
                    setPricingField("lot_quantity", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Fabricação do lote
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.production_cost_total}
                  onChange={(e) =>
                    setPricingField("production_cost_total", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Embalagens
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.packaging_cost_total}
                  onChange={(e) =>
                    setPricingField("packaging_cost_total", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Rótulos
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.labels_cost_total}
                  onChange={(e) =>
                    setPricingField("labels_cost_total", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Caixas e materiais de envio
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.shipping_materials_cost_total}
                  onChange={(e) =>
                    setPricingField(
                      "shipping_materials_cost_total",
                      e.target.value
                    )
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Frete da fábrica
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.factory_freight_cost_total}
                  onChange={(e) =>
                    setPricingField("factory_freight_cost_total", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-zinc-50 p-5">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-helo-dark">
                Custos de venda e margem
              </h3>
              <p className="text-sm text-zinc-500">
                Percentuais e custos médios por pedido.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Taxa média de pagamento (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.payment_fee_percent}
                  onChange={(e) =>
                    setPricingField("payment_fee_percent", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Impostos sobre venda (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.sales_tax_percent}
                  onChange={(e) =>
                    setPricingField("sales_tax_percent", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Envio pago pela empresa
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.company_shipping_cost_avg}
                  onChange={(e) =>
                    setPricingField("company_shipping_cost_avg", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Aquisição de cliente
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.customer_acquisition_cost_avg}
                  onChange={(e) =>
                    setPricingField(
                      "customer_acquisition_cost_avg",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-helo-dark">
                  Margem de lucro desejada (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-helo-dark/10 bg-white px-4 py-3"
                  value={pricing.desired_profit_margin_percent}
                  onChange={(e) =>
                    setPricingField(
                      "desired_profit_margin_percent",
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-helo-dark/10 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-helo-dark">
            Resultado
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            O preço do site só muda se você aplicar e salvar.
          </p>

          <div className="mt-5 grid gap-3 text-sm">
            {[
              ["Custo total do lote", pricingResult.productionTotal],
              ["Custo unitário de produção", pricingResult.unitProductionCost],
              ["Custo fixo por venda", pricingResult.fixedCostPerSale],
              ["Preço mínimo sugerido", pricingResult.minimumSuggestedPrice],
              ["Preço comercial sugerido", pricingResult.commercialSuggestedPrice],
              ["Preço atual", pricingResult.currentPrice],
              ["Custo estimado no preço atual", pricingResult.estimatedCost],
              ["Lucro estimado no preço atual", pricingResult.estimatedProfit],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-3 py-2"
              >
                <span className="text-zinc-600">{label}</span>
                <strong className="text-helo-dark">
                  R$ {numberToReais(value)}
                </strong>
              </div>
            ))}

            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#fff7f9] px-3 py-2">
              <span className="text-zinc-600">Margem real no preço atual</span>
              <strong className="text-helo-dark">
                {pricingResult.realMargin.toFixed(2).replace(".", ",")}%
              </strong>
            </div>
          </div>

          {pricingResult.variablePercent >= 1 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Taxas, impostos e margem somam 100% ou mais. Reduza algum
              percentual para calcular o preço sugerido.
            </div>
          )}

          <button
            type="button"
            disabled={!pricingResult.commercialSuggestedPrice}
            onClick={() =>
              setPrice(numberToReais(pricingResult.commercialSuggestedPrice))
            }
            className="mt-5 w-full rounded-xl bg-helo-dark px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Aplicar preço sugerido no produto
          </button>
        </div>
      </div>
    </div>
  )}

  {/* BOTÃO */}
  <div className="
    flex
    justify-end
  ">

    <button
      type="submit"

      className="
        px-8
        py-3
        rounded-xl
        bg-helo-dark
        text-white
        font-semibold
      "
    >
      {mode === "edit"
        ? "Salvar alterações"
        : "Cadastrar produto"}
    </button>
  </div>
</form>
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
                <option value="display">Ordem da vitrine</option>
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
            <div>
              <h2 className="text-2xl font-display text-helo-dark">Produtos cadastrados</h2>
              {canReorderProducts() ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Arraste os produtos para definir a ordem da home e da página de produtos.
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  Para reorganizar, use "Ordem da vitrine", somente ativos, todas categorias e sem busca.
                </p>
              )}
            </div>
            <div className="text-helo-text/80 font-body">
              {savingProductOrder
                ? "Salvando ordem..."
                : loading
                  ? "Carregando..."
                  : `${items.length} item(s)`}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {(canReorderProducts() ? getOrderedProducts() : items).map((p) => (
              <div
                key={p.id}
                draggable={canReorderProducts() && !savingProductOrder}
                onDragStart={(event) => {
                  if (!canReorderProducts()) return;
                  setDraggedProductId(p.id);
                  event.dataTransfer.effectAllowed =
                    "move";
                  event.dataTransfer.setData(
                    "text/plain",
                    String(p.id)
                  );
                }}
                onDragOver={(event) => {
                  if (!canReorderProducts()) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect =
                    "move";
                  setDragOverProductId(p.id);
                }}
                onDragLeave={() => {
                  setDragOverProductId((current) =>
                    current === p.id
                      ? null
                      : current
                  );
                }}
                onDrop={(event) =>
                  handleProductDrop(
                    event,
                    p
                  )
                }
                onDragEnd={() => {
                  setDraggedProductId(null);
                  setDragOverProductId(null);
                }}
                className={`
                  bg-white/70
                  border
                  border-white/40
                  rounded-2xl
                  shadow
                  p-4
                  flex
                  gap-4
                  transition
                  ${canReorderProducts()
                    ? "cursor-grab active:cursor-grabbing"
                    : ""}
                  ${draggedProductId === p.id
                    ? "opacity-50"
                    : ""}
                  ${dragOverProductId === p.id
                    ? "border-helo-dark ring-2 ring-helo-dark/15"
                    : ""}
                `}
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
                      <div className="mt-1 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                        Ordem da vitrine: {p.sort_order ?? 0}
                      </div>
                      {p.subtitle && (
                        <div className="mt-1 line-clamp-2 text-sm leading-5 text-helo-text/70">
                          {p.subtitle}
                        </div>
                      )}
                      {p.meta_description && (
                        <div className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
                          SEO: {p.meta_description}
                        </div>
                      )}
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
                      {p.is_featured && (
                        <div className="mt-2 inline-flex rounded-full bg-[#fff0f4] px-3 py-1 text-xs font-semibold text-[#b74662]">
                          Destaque da home
                        </div>
                      )}
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
