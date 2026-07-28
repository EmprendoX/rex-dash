import Link from "next/link";
import NuevoClienteForm from "./NuevoClienteForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NuevoClientePage() {
  const supabase = createSupabaseServerClient();
  const { data: afiliados } = await supabase
    .from("afiliados")
    .select("id, nombre, codigo")
    .eq("estatus", "activo")
    .order("nombre");

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/clientes" className="text-sm text-slate-500 hover:text-slate-900">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nuevo cliente</h1>
      </div>
      <NuevoClienteForm afiliados={afiliados ?? []} />
    </div>
  );
}
