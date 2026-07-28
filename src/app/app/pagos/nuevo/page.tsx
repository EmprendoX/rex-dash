import Link from "next/link";
import NuevoPagoForm from "./NuevoPagoForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Props {
  searchParams: { cliente_id?: string };
}

export default async function NuevoPagoPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, inmobiliaria")
    .neq("estatus", "cancelado")
    .order("nombre");

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/pagos" className="text-sm text-slate-500 hover:text-slate-900">
          ← Pagos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Registrar pago</h1>
      </div>
      <NuevoPagoForm clientes={clientes ?? []} defaultClienteId={searchParams.cliente_id} />
    </div>
  );
}
