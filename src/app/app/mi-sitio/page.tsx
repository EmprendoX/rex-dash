import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MiSitioEditor from "./MiSitioEditor";

export default async function MiSitioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "operator") redirect("/app");
  if (!user.cliente_id) {
    return (
      <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">Cuenta pendiente de vinculación</h1>
        <p className="mt-2 text-sm text-amber-800">
          Tu usuario existe pero todavía no está vinculado a ningún cliente. Contactá al equipo de RealEX.
        </p>
      </div>
    );
  }

  const supabase = createSupabaseServerClient();
  const [{ data: cliente }, { data: sitio }] = await Promise.all([
    supabase.from("clientes").select("nombre, inmobiliaria").eq("id", user.cliente_id).maybeSingle(),
    supabase.from("sitios").select("*").eq("cliente_id", user.cliente_id).maybeSingle(),
  ]);

  if (!sitio) {
    return (
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">Tu sitio aún no está creado</h1>
        <p className="mt-2 text-sm text-slate-600">
          El equipo de RealEX está terminando la configuración. Vas a poder editar el contenido acá cuando esté listo.
        </p>
      </div>
    );
  }

  const url = sitio.dominio_custom
    ? `https://${sitio.dominio_custom}`
    : sitio.subdominio
      ? `https://${sitio.subdominio}.netlify.app`
      : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Mi sitio</h1>
        <p className="mt-1 text-sm text-slate-500">
          {cliente?.inmobiliaria || cliente?.nombre} — editá el contenido acá y publicá cuando quieras.
        </p>
      </div>
      <MiSitioEditor
        initialConfig={JSON.stringify(sitio.config, null, 2)}
        siteUrl={url}
        isDeployed={!!sitio.netlify_site_id && sitio.estatus !== "suspendido"}
      />
    </div>
  );
}
