import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BarChart3,
  Edit3,
  Plus,
  Save,
  TicketPercent,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import Formatter from "../../utils/Formatter";

const emptyForm = {
  id: null,
  code: "",
  name: "",
  partner_name: "",
  partner_email: "",
  discount_type: "percent",
  discount_value: 10,
  min_subtotal: 0,
  max_discount: "",
  usage_limit: "",
  usage_limit_per_customer: 1,
  starts_at: "",
  ends_at: "",
  allow_pix_discount: true,
  commission_percent: 0,
  is_active: true,
};

function formatDateInput(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

function discountLabel(coupon) {
  if (coupon.discount_type === "free_shipping") {
    return "Frete grátis";
  }

  if (coupon.discount_type === "fixed") {
    return Formatter.formataMoeda(coupon.discount_value);
  }

  return `${Number(coupon.discount_value || 0)}%`;
}

function payloadFromForm(form) {
  return {
    ...form,
    code:
      form.code.trim().toUpperCase(),
    discount_value:
      Number(form.discount_value || 0),
    min_subtotal:
      Number(form.min_subtotal || 0),
    max_discount:
      form.max_discount === ""
        ? null
        : Number(form.max_discount),
    usage_limit:
      form.usage_limit === ""
        ? null
        : Number(form.usage_limit),
    usage_limit_per_customer:
      form.usage_limit_per_customer === ""
        ? null
        : Number(form.usage_limit_per_customer),
    starts_at:
      form.starts_at || null,
    ends_at:
      form.ends_at || null,
    commission_percent:
      Number(form.commission_percent || 0),
  };
}

export default function CouponsPage() {
  const [coupons, setCoupons] =
    useState([]);
  const [report, setReport] =
    useState(null);
  const [form, setForm] =
    useState(emptyForm);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [notice, setNotice] =
    useState("");

  const reportRows =
    report?.rows || [];

  const activeCoupons =
    useMemo(
      () =>
        coupons.filter(
          (coupon) =>
            coupon.is_active
        ).length,
      [coupons]
    );

  async function loadData() {
    try {
      setLoading(true);

      const [couponResponse, reportResponse] =
        await Promise.all([
          api.get("/coupons"),
          api.get("/coupons/report"),
        ]);

      setCoupons(
        couponResponse.data
      );
      setReport(
        reportResponse.data
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]:
        value,
    }));
  }

  function editCoupon(coupon) {
    setNotice("");
    setForm({
      ...coupon,
      starts_at:
        formatDateInput(
          coupon.starts_at
        ),
      ends_at:
        formatDateInput(
          coupon.ends_at
        ),
      max_discount:
        coupon.max_discount ?? "",
      usage_limit:
        coupon.usage_limit ?? "",
      usage_limit_per_customer:
        coupon.usage_limit_per_customer ?? "",
    });
  }

  async function saveCoupon() {
    try {
      setSaving(true);
      setNotice("");

      const payload =
        payloadFromForm(form);

      if (form.id) {
        await api.put(
          `/coupons/${form.id}`,
          payload
        );
      } else {
        await api.post(
          "/coupons",
          payload
        );
      }

      setForm(emptyForm);
      await loadData();
      setNotice("Cupom salvo com sucesso.");
    } catch (error) {
      setNotice(
        error?.response?.data?.error ||
          "Erro ao salvar cupom."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCoupon(coupon) {
    if (
      !window.confirm(
        `Desativar o cupom ${coupon.code}?`
      )
    ) {
      return;
    }

    await api.delete(
      `/coupons/${coupon.id}`
    );
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Carregando cupons...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-3 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Cupons e influencers
              </h1>
              <p className="mt-1 text-zinc-500">
                Cadastro de cupons, regras de desconto e relatório de parcerias.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setNotice("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              <Plus size={16} />
              Novo cupom
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Cupons ativos</p>
              <p className="mt-2 text-2xl font-bold">{activeCoupons}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Pedidos com cupom</p>
              <p className="mt-2 text-2xl font-bold">{report?.summary?.total_orders || 0}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Faturamento pago</p>
              <p className="mt-2 text-2xl font-bold">{Formatter.formataMoeda(report?.summary?.revenue_total || 0)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500">Comissão estimada</p>
              <p className="mt-2 text-2xl font-bold">{Formatter.formataMoeda(report?.summary?.estimated_commission || 0)}</p>
            </div>
          </div>
        </div>

        {notice && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {notice}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl border bg-white p-5">
            <div className="mb-5 flex items-center gap-2">
              <TicketPercent size={18} className="text-[#d9536f]" />
              <h2 className="text-xl font-semibold">
                Cupons cadastrados
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-zinc-50 text-left">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Influencer</th>
                    <th className="p-3">Desconto</th>
                    <th className="p-3">Usos</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b hover:bg-zinc-50">
                      <td className="p-3 font-semibold">{coupon.code}</td>
                      <td className="p-3">{coupon.partner_name}</td>
                      <td className="p-3">{discountLabel(coupon)}</td>
                      <td className="p-3">{coupon.usage_count || 0}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          coupon.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {coupon.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => editCoupon(coupon)}
                          className="mr-3 inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Edit3 size={14} />
                          Editar
                        </button>
                        {coupon.is_active && (
                          <button
                            type="button"
                            onClick={() => deactivateCoupon(coupon)}
                            className="inline-flex items-center gap-1 text-red-600 hover:underline"
                          >
                            <X size={14} />
                            Desativar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-2xl border bg-white p-5">
            <h2 className="text-xl font-semibold">
              {form.id ? "Editar cupom" : "Novo cupom"}
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-zinc-600">
                Código
                <input
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                  className="mt-2 h-12 w-full rounded-xl border px-4 font-semibold uppercase text-zinc-900"
                  placeholder="BLOGUEIRA10"
                />
              </label>

              <label className="text-sm text-zinc-600">
                Nome interno
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  placeholder="Campanha da Ana"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Influencer
                  <input
                    value={form.partner_name}
                    onChange={(event) => updateForm("partner_name", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  E-mail
                  <input
                    value={form.partner_email || ""}
                    onChange={(event) => updateForm("partner_email", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Tipo
                  <select
                    value={form.discount_type}
                    onChange={(event) => updateForm("discount_type", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  >
                    <option value="percent">Percentual</option>
                    <option value="fixed">Valor fixo</option>
                    <option value="free_shipping">Frete grátis</option>
                  </select>
                </label>
                <label className="text-sm text-zinc-600">
                  Valor do desconto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    disabled={form.discount_type === "free_shipping"}
                    onChange={(event) => updateForm("discount_value", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900 disabled:bg-zinc-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Compra mínima
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_subtotal}
                    onChange={(event) => updateForm("min_subtotal", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Teto do desconto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_discount ?? ""}
                    onChange={(event) => updateForm("max_discount", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Limite total
                  <input
                    type="number"
                    min="0"
                    value={form.usage_limit ?? ""}
                    onChange={(event) => updateForm("usage_limit", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                    placeholder="Ilimitado"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Limite por cliente
                  <input
                    type="number"
                    min="0"
                    value={form.usage_limit_per_customer ?? ""}
                    onChange={(event) => updateForm("usage_limit_per_customer", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-zinc-600">
                  Início
                  <input
                    type="date"
                    value={form.starts_at || ""}
                    onChange={(event) => updateForm("starts_at", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Fim
                  <input
                    type="date"
                    value={form.ends_at || ""}
                    onChange={(event) => updateForm("ends_at", event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                  />
                </label>
              </div>

              <label className="text-sm text-zinc-600">
                Comissão da influencer (%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commission_percent}
                  onChange={(event) => updateForm("commission_percent", event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border px-4 text-zinc-900"
                />
              </label>

              <label className="flex items-start gap-3 rounded-xl border bg-zinc-50 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={form.allow_pix_discount}
                  onChange={(event) => updateForm("allow_pix_discount", event.target.checked)}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-medium">Acumular com desconto PIX</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    Quando desligado, o cliente usa o cupom, mas não recebe o desconto extra do PIX.
                  </span>
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border bg-zinc-50 p-4 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateForm("is_active", event.target.checked)}
                  className="h-5 w-5"
                />
                Cupom ativo
              </label>

              <button
                type="button"
                onClick={saveCoupon}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d9536f] text-sm font-semibold text-white transition hover:bg-[#c34862] disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar cupom"}
              </button>
            </div>
          </aside>
        </div>

        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={18} className="text-[#d9536f]" />
            <h2 className="text-xl font-semibold">
              Relatório por influencer
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-zinc-50 text-left">
                <tr>
                  <th className="p-3">Influencer</th>
                  <th className="p-3">Cupom</th>
                  <th className="p-3">Pedidos</th>
                  <th className="p-3">Pagos</th>
                  <th className="p-3">Faturamento</th>
                  <th className="p-3">Descontos</th>
                  <th className="p-3">Ticket médio</th>
                  <th className="p-3">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => (
                  <tr key={row.coupon_id} className="border-b hover:bg-zinc-50">
                    <td className="p-3 font-medium">{row.partner_name}</td>
                    <td className="p-3">{row.code}</td>
                    <td className="p-3">{row.total_orders}</td>
                    <td className="p-3">{row.paid_orders}</td>
                    <td className="p-3">{Formatter.formataMoeda(row.revenue_total)}</td>
                    <td className="p-3">{Formatter.formataMoeda(row.discount_total)}</td>
                    <td className="p-3">{Formatter.formataMoeda(row.average_ticket)}</td>
                    <td className="p-3">{Formatter.formataMoeda(row.estimated_commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
