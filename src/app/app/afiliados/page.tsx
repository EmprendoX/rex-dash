import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMXN } from "@/lib/format";

const ESTATUS_STYLE: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-800",
  pausado: "bg-amber-100 text-amber-800",
  baja: "bg-slate-100 text-slate-600",
};

export default async function AfiliadosPage() {
  const supabase = createSupabaseServerClient();

  const [{ data: afiliados, error }, { data: comisiones }] = await Promise.all([
    supabase
      .from("afiliados")
      .select("id, nombre, codigo, email, whatsapp, estatus, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("comisiones")
      .select("afiliado_id, monto_mxn, estatus"),
  ]);

  if (error) {
    return <div className="text-red-700">Error: {error.message}</div>;
  }

  // Aggregate commissions per afiliado in memory (Fase 1: bajo volumen).
  const stats = new Map<string, { devengado: number; pagado: number; por_pagar: number }>();
  for (const c of comisiones ?? []) {
    const s = stats.get(c.afiliado_id) ?? { devengado: 0, pagado: 0, por_pagar: 0 };
    const monto = Number(c.monto_mxn);
    if (c.estatus === "devengada") s.devengado += monto;
    else if (c.estatus === "por_pagar") s.por_pagar += monto;
    else if (c.estatus === "pagada") s.pagado += monto;
    stats.set(c.afiliado_id, s);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Afiliados</h1>
        <Link
          href="/app/afiliados/nuevo"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nuevo afiliado
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Estatus</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium text-right">Devengado</th>
              <th className="px-4 py-3 font-medium text-right">Por pagar</th>
              <th className="px-4 py-3 font-medium text-right">Pagado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(afiliados ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Sin afiliados todavía.
                </td>
              </tr>
            )}
            {(afiliados ?? []).map((a) => {
              const s = stats.get(a.id) ?? { devengado: 0, pagado: 0, por_pagar: 0 };
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/afiliados/${a.id}`} className="font-medium text-slate-900 hover:underline">
                      {a.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.codigo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ESTATUS_STYLE[a.estatus] ?? ""
                      }`}
                    >
                      {a.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {a.email || a.whatsapp || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">{formatMXN(s.devengado)}</td>
                  <td className="px-4 py-3 text-right text-slate-900">{formatMXN(s.por_pagar)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatMXN(s.pagado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
