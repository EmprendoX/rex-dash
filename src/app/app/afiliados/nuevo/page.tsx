import Link from "next/link";
import NuevoAfiliadoForm from "./NuevoAfiliadoForm";

export default function NuevoAfiliadoPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/app/afiliados" className="text-sm text-slate-500 hover:text-slate-900">
          ← Afiliados
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Nuevo afiliado</h1>
      </div>
      <NuevoAfiliadoForm />
    </div>
  );
}
