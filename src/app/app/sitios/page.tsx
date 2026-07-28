import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import RebuildAllButton from "./RebuildAllButton";
import type { Enums } from "@/lib/supabase/database.types";

const ESTATUS_STYLE: Record<Enums<"sitio_estatus">, string> = {
  creado: "bg-slate-100 text-slate-700",
  build_ok: "bg-blue-100 text-blue-800",
  build_error: "bg-red-100 text-red-800",
  live: "bg-emerald-100 text-emerald-800",
  suspendido: "bg-slate-300 text-slate-700",
};

export default async function SitiosPage() {
  const supabase = createSupabaseServerClient();
  const { data: sitios, error } = await supabase
    .from("sitios")
    .select(
      "id, subdominio, dominio_custom, estatus, estado_dns, netlify_site_id, ultimo_deploy_at, cliente_id, clientes(nombre)",
    )
    .order("created_at", { ascending: false });

  if (error) return <div className="text-red-700">Error: {error.message}</div>;

  const liveSites = (sitios ?? []).filter((s) => !!s.netlify_site_id && s.estatus !== "suspendido");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Sitios</h1>
        <RebuildAllButton count={liveSites.length} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Estatus</th>
              <th className="px-4 py-3 font-medium">DNS</th>
              <th className="px-4 py-3 font-medium">Netlify</th>
              <th className="px-4 py-3 font-medium">Último deploy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(sitios ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Sin sitios. Los sitios se crean desde el detalle de un cliente.
                </td>
              </tr>
            )}
            {(sitios ?? []).map((s) => {
              const cli = Array.isArray(s.clientes) ? s.clientes[0] : s.clientes;
              const url = s.dominio_custom
                ? `https://${s.dominio_custom}`
                : s.subdominio
                  ? `https://${s.subdominio}.netlify.app`
                  : null;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/sitios/${s.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {cli?.nombre ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:underline"
                      >
                        {url.replace(/^https:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-slate-400">sin subdominio</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ESTATUS_STYLE[s.estatus] ?? ""
                      }`}
                    >
                      {s.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{s.estado_dns}</td>
                  <td className="px-4 py-3 text-xs">
                    {s.netlify_site_id ? (
                      <span className="font-mono text-slate-500">
                        {s.netlify_site_id.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-slate-400">no creado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {formatDate(s.ultimo_deploy_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
