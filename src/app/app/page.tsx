import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatMXN } from "@/lib/format";

function firstOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function InicioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Broker: goes straight to their own site editor.
  if (user.role === "broker") redirect("/app/mi-sitio");

  const supabase = createSupabaseServerClient();
  const monthStart = firstOfMonthISO();

  const [
    { data: suscripcionesActivas },
    { data: clientesActivos },
    { data: sitiosLive },
    { data: sitiosBuildError },
    { data: pagosMes },
    { data: comisionesPendientes },
    { data: recentPagos },
    { data: recentClientes },
  ] = await Promise.all([
    supabase.from("suscripciones").select("monto_mxn").eq("estatus", "activa"),
    supabase.from("clientes").select("id", { count: "exact" }).eq("estatus", "activo"),
    supabase.from("sitios").select("id", { count: "exact" }).eq("estatus", "live"),
    supabase.from("sitios").select("id, cliente_id, clientes(nombre)").eq("estatus", "build_error"),
    supabase.from("pagos").select("monto_mxn, concepto").gte("fecha", monthStart),
    supabase
      .from("comisiones")
      .select("monto_mxn, estatus")
      .in("estatus", ["devengada", "por_pagar"]),
    supabase
      .from("pagos")
      .select("id, fecha, concepto, monto_mxn, cliente_id, clientes(nombre)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("clientes")
      .select("id, nombre, estatus, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const mrr = (suscripcionesActivas ?? []).reduce((s, r) => s + Number(r.monto_mxn), 0);
  const activos = clientesActivos?.length ?? 0;
  const live = sitiosLive?.length ?? 0;
  const buildErrors = sitiosBuildError ?? [];
  const ventasMes = (pagosMes ?? []).reduce((s, r) => s + Number(r.monto_mxn), 0);
  const ventasMesFrontend = (pagosMes ?? [])
    .filter((r) => r.concepto === "frontend")
    .reduce((s, r) => s + Number(r.monto_mxn), 0);
  const porPagar = (comisionesPendientes ?? []).reduce(
    (s, r) => s + Number(r.monto_mxn),
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inicio</h1>
        <p className="mt-1 text-sm text-slate-500">Vista general del mes.</p>
      </div>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="MRR" value={formatMXN(mrr)} sub="Suscripciones activas" href="/app/clientes?estatus=activo" />
          <Kpi label="Clientes activos" value={String(activos)} href="/app/clientes?estatus=activo" />
          <Kpi label="Sitios live" value={String(live)} href="/app/sitios" />
          <Kpi label="Ventas del mes" value={formatMXN(ventasMes)} sub={`${formatMXN(ventasMesFrontend)} frontend`} href="/app/pagos" />
          <Kpi label="Comisiones por pagar" value={formatMXN(porPagar)} highlight={porPagar > 0} href="/app/comisiones?estatus=por_pagar" />
          <Kpi label="Sitios con build error" value={String(buildErrors.length)} alert={buildErrors.length > 0} href="/app/sitios" />
        </div>

        {buildErrors.length > 0 && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <strong>Atención:</strong> {buildErrors.length} sitio(s) con build en error.{" "}
            {buildErrors.slice(0, 3).map((s) => {
              const cli = Array.isArray(s.clientes) ? s.clientes[0] : s.clientes;
              return (
                <Link key={s.id} href={`/app/sitios/${s.id}`} className="underline hover:no-underline mr-2">
                  {cli?.nombre ?? s.id}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Últimos pagos</h2>
            <Link href="/app/pagos" className="text-xs text-slate-500 hover:text-slate-900">Ver todos →</Link>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {(recentPagos ?? []).length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-slate-500">Sin pagos aún.</td></tr>
                )}
                {(recentPagos ?? []).map((p) => {
                  const cli = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-xs text-slate-500 w-24">{formatDate(p.fecha)}</td>
                      <td className="px-4 py-2">
                        <Link href={`/app/clientes/${p.cliente_id}`} className="text-slate-900 hover:underline">
                          {cli?.nombre ?? "—"}
                        </Link>
                        <span className="ml-2 text-xs text-slate-500">{p.concepto}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">{formatMXN(p.monto_mxn)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Últimos clientes</h2>
            <Link href="/app/clientes" className="text-xs text-slate-500 hover:text-slate-900">Ver todos →</Link>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {(recentClientes ?? []).length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-slate-500">Sin clientes aún.</td></tr>
                )}
                {(recentClientes ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-xs text-slate-500 w-24">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-2">
                      <Link href={`/app/clientes/${c.id}`} className="text-slate-900 hover:underline">{c.nombre}</Link>
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-600">{c.estatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label, value, sub, href, highlight, alert,
}: {
  label: string; value: string; sub?: string; href?: string; highlight?: boolean; alert?: boolean;
}) {
  const cls = `block rounded-lg border p-4 transition ${
    alert ? "border-red-200 bg-red-50 hover:bg-red-100"
      : highlight ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
      : "border-slate-200 bg-white hover:bg-slate-50"
  }`;
  const inner = (
    <>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </>
  );
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
