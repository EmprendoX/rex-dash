import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import SitioEditor from "./SitioEditor";

export default async function SitioDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: sitio } = await supabase
    .from("sitios")
    .select("*, clientes(id, nombre, inmobiliaria, subdominio_propuesto)")
    .eq("id", params.id)
    .maybeSingle();

  if (!sitio) notFound();

  const cli = Array.isArray(sitio.clientes) ? sitio.clientes[0] : sitio.clientes;
  const url = sitio.dominio_custom
    ? `https://${sitio.dominio_custom}`
    : sitio.subdominio
      ? `https://${sitio.subdominio}.netlify.app`
      : null;

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/sitios" className="text-sm text-slate-500 hover:text-slate-900">
          ← Sitios
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Sitio de {cli?.nombre ?? "—"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Estatus <strong>{sitio.estatus}</strong> · DNS {sitio.estado_dns} · último deploy{" "}
          {formatDate(sitio.ultimo_deploy_at)}
          {cli && (
            <>
              {" · "}
              <Link href={`/app/clientes/${cli.id}`} className="hover:underline">
                Ver cliente →
              </Link>
            </>
          )}
        </p>
        {url && (
          <p className="mt-1 text-sm">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 hover:underline"
            >
              {url.replace(/^https:\/\//, "")} ↗
            </a>
          </p>
        )}
      </div>

      <SitioEditor
        sitioId={sitio.id}
        initialConfig={JSON.stringify(sitio.config, null, 2)}
        subdominio={sitio.subdominio ?? ""}
        dominioCustom={sitio.dominio_custom ?? ""}
        netlifySiteId={sitio.netlify_site_id ?? null}
        estatus={sitio.estatus}
        subdominioPropuesto={cli?.subdominio_propuesto ?? null}
      />
    </div>
  );
}
