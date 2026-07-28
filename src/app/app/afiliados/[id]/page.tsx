import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMXN, formatDate } from "@/lib/format";

export default async function AfiliadoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();

  const [{ data: afiliado }, { data: clientes }, { data: comisiones }] =
    await Promise.all([
      supabase
        .from("afiliados")
        .select("*")
        .eq("id", params.id)
        .maybeSingle(),
      supabase
        .from("clientes")
        .select("id, nombre, estatus, created_at")
        .eq("afiliado_id", params.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("comisiones")
        .select("id, tipo, monto_mxn, estatus, fecha_devengo, fecha_pago")
        .eq("afiliado_id", params.id)
        .order("fecha_devengo", { ascending: false }),
    ]);

  if (!afiliado) notFound();

  const totals = { devengado: 0, por_pagar: 0, pagado: 0 };
  for (const c of comisiones ?? []) {
    const m = Number(c.monto_mxn);
    if (c.estatus === "devengada") totals.devengado += m;
    else if (c.estatus === "por_pagar") totals.por_pagar += m;
    else if (c.estatus === "pagada") totals.pagado += m;
  }

  const dp = (afiliado.datos_pago ?? null) as
    | { banco?: string; clabe?: string; titular?: string }
    | null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/afiliados" className="text-sm text-slate-500 hover:text-slate-900">
          ← Afiliados
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{afiliado.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Código <code className="font-mono">{afiliado.codigo}</code> ·
          estatus <strong>{afiliado.estatus}</strong> ·
          alta {formatDate(afiliado.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Devengado" value={formatMXN(totals.devengado)} />
        <Kpi label="Por pagar" value={formatMXN(totals.por_pagar)} highlight />
        <Kpi label="Pagado" value={formatMXN(totals.pagado)} muted />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Contacto y pago</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 space-y-1">
          <div>Email: {afiliado.email ?? "—"}</div>
          <div>WhatsApp: {afiliado.whatsapp ?? "—"}</div>
          <div>Banco: {dp?.banco || "—"}</div>
          <div>CLABE: {dp?.clabe ? <span className="font-mono">{dp.clabe}</span> : "—"}</div>
          <div>Titular: {dp?.titular || "—"}</div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Clientes referidos ({clientes?.length ?? 0})
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Estatus</th>
                <th className="px-4 py-2 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(clientes ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Sin clientes referidos.
                  </td>
                </tr>
              )}
              {(clientes ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <Link href={`/app/clientes/${c.id}`} className="text-slate-900 hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.estatus}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Comisiones ({comisiones?.length ?? 0})
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium text-right">Monto</th>
                <th className="px-4 py-2 font-medium">Estatus</th>
                <th className="px-4 py-2 font-medium">Devengo</th>
                <th className="px-4 py-2 font-medium">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(comisiones ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Sin comisiones devengadas.
                  </td>
                </tr>
              )}
              {(comisiones ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-slate-700">{c.tipo}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{formatMXN(c.monto_mxn)}</td>
                  <td className="px-4 py-2 text-slate-600">{c.estatus}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(c.fecha_devengo)}</td>
                  <td className="px-4 py-2 text-slate-500">{formatDate(c.fecha_pago)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
