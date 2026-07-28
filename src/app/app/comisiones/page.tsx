import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMXN } from "@/lib/format";
import ComisionesTable from "./ComisionesTable";
import type { Enums } from "@/lib/supabase/database.types";

interface Props {
  searchParams: {
    from?: string;
    to?: string;
    estatus?: string;
  };
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ComisionesPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();

  const now = new Date();
  const defaultFrom = startOfMonth(now);
  const defaultTo = today();
  const from = searchParams.from || defaultFrom;
  const to = searchParams.to || defaultTo;
  const estatus = searchParams.estatus || "todos";

  let q = supabase
    .from("comisiones")
    .select(
      "id, fecha_devengo, fecha_pago, tipo, estatus, base_mxn, porcentaje, monto_mxn, referencia_pago, afiliados(id, nombre, codigo), clientes(id, nombre)",
    )
    .gte("fecha_devengo", from)
    .lte("fecha_devengo", to)
    .order("fecha_devengo", { ascending: false });

  if (estatus !== "todos") q = q.eq("estatus", estatus as Enums<"comision_estatus">);

  const { data, error } = await q;
  if (error) return <div className="text-red-700">Error: {error.message}</div>;

  const rows = (data ?? []).map((c) => ({
    id: c.id,
    fecha_devengo: c.fecha_devengo,
    fecha_pago: c.fecha_pago,
    tipo: c.tipo,
    estatus: c.estatus,
    base_mxn: Number(c.base_mxn),
    porcentaje: Number(c.porcentaje),
    monto_mxn: Number(c.monto_mxn),
    referencia_pago: c.referencia_pago,
    afiliado: (() => {
      const a = Array.isArray(c.afiliados) ? c.afiliados[0] : c.afiliados;
      return a ? { id: a.id, nombre: a.nombre, codigo: a.codigo } : null;
    })(),
    cliente: (() => {
      const cl = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes;
      return cl ? { id: cl.id, nombre: cl.nombre } : null;
    })(),
  }));

  const totals = rows.reduce(
    (acc, r) => {
      if (r.estatus === "devengada") acc.devengado += r.monto_mxn;
      else if (r.estatus === "por_pagar") acc.por_pagar += r.monto_mxn;
      else if (r.estatus === "pagada") acc.pagado += r.monto_mxn;
      return acc;
    },
    { devengado: 0, por_pagar: 0, pagado: 0 },
  );

  const exportUrl = `/api/comisiones/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&estatus=${encodeURIComponent(estatus)}`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Comisiones</h1>
        <a
          href={exportUrl}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 text-sm" method="get">
        <label>
          <span className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Desde</span>
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Hasta</span>
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label>
          <span className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Estatus</span>
          <select
            name="estatus"
            defaultValue={estatus}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="devengada">Devengada</option>
            <option value="por_pagar">Por pagar</option>
            <option value="pagada">Pagada</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Aplicar
        </button>
        <Link
          href={`/app/comisiones?from=${startOfMonth(now)}&to=${endOfMonth(now)}`}
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          Este mes
        </Link>
        {(() => {
          const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return (
            <Link
              href={`/app/comisiones?from=${startOfMonth(prev)}&to=${endOfMonth(prev)}`}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Mes pasado
            </Link>
          );
        })()}
      </form>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="Devengado" value={formatMXN(totals.devengado)} />
        <Kpi label="Por pagar" value={formatMXN(totals.por_pagar)} highlight />
        <Kpi label="Pagado" value={formatMXN(totals.pagado)} muted />
      </div>

      <div className="mt-6">
        <ComisionesTable rows={rows} />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : muted
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
