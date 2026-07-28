import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate, formatMXN } from "@/lib/format";

const CONCEPTO_STYLE: Record<string, string> = {
  frontend: "bg-blue-100 text-blue-800",
  mensual: "bg-emerald-100 text-emerald-800",
  upsell: "bg-violet-100 text-violet-800",
};

export default async function PagosPage() {
  const supabase = createSupabaseServerClient();
  const { data: pagos, error } = await supabase
    .from("pagos")
    .select("id, fecha, concepto, monto_mxn, metodo, referencia, cliente_id, clientes(nombre)")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return <div className="text-red-700">Error: {error.message}</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Pagos</h1>
        <Link
          href="/app/pagos/nuevo"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Registrar pago
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Referencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(pagos ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Sin pagos registrados.
                </td>
              </tr>
            )}
            {(pagos ?? []).map((p) => {
              const cli = Array.isArray(p.clientes) ? p.clientes[0] : p.clientes;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.fecha)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/app/clientes/${p.cliente_id}`} className="text-slate-900 hover:underline">
                      {cli?.nombre ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        CONCEPTO_STYLE[p.concepto] ?? ""
                      }`}
                    >
                      {p.concepto}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatMXN(p.monto_mxn)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.metodo ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.referencia ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
