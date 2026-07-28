import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Enums } from "@/lib/supabase/database.types";

const ESTATUS_STYLE: Record<Enums<"cliente_estatus">, string> = {
  prospecto: "bg-slate-100 text-slate-700",
  pagado: "bg-blue-100 text-blue-800",
  generado: "bg-indigo-100 text-indigo-800",
  desplegado: "bg-violet-100 text-violet-800",
  entregado: "bg-emerald-100 text-emerald-800",
  activo: "bg-emerald-600 text-white",
  cancelado: "bg-slate-300 text-slate-700 line-through",
};

const ESTATUS_OPTIONS = [
  "prospecto", "pagado", "generado", "desplegado", "entregado", "activo", "cancelado",
] as const;
const ORIGEN_OPTIONS = ["meta_ads", "afiliado", "directo", "referido"] as const;

interface Props {
  searchParams: {
    estatus?: string;
    origen?: string;
    afiliado?: string;
  };
}

export default async function ClientesPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();

  let q = supabase
    .from("clientes")
    .select("id, nombre, inmobiliaria, estatus, origen, afiliado_id, created_at, afiliados(nombre)")
    .order("created_at", { ascending: false });

  if (searchParams.estatus) q = q.eq("estatus", searchParams.estatus as Enums<"cliente_estatus">);
  if (searchParams.origen) q = q.eq("origen", searchParams.origen as Enums<"cliente_origen">);
  if (searchParams.afiliado) q = q.eq("afiliado_id", searchParams.afiliado);

  const [{ data: clientes, error }, { data: afiliados }] = await Promise.all([
    q,
    supabase.from("afiliados").select("id, nombre").order("nombre"),
  ]);

  if (error) return <div className="text-red-700">Error: {error.message}</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <Link
          href="/app/clientes/nuevo"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nuevo cliente
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3 text-sm" method="get">
        <FilterSelect name="estatus" label="Estatus" value={searchParams.estatus} options={[...ESTATUS_OPTIONS]} />
        <FilterSelect name="origen" label="Origen" value={searchParams.origen} options={[...ORIGEN_OPTIONS]} />
        <FilterSelect
          name="afiliado"
          label="Afiliado"
          value={searchParams.afiliado}
          options={(afiliados ?? []).map((a) => ({ value: a.id, label: a.nombre }))}
        />
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Aplicar
        </button>
        {(searchParams.estatus || searchParams.origen || searchParams.afiliado) && (
          <Link href="/app/clientes" className="self-center text-sm text-slate-500 hover:text-slate-900">
            Limpiar
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Inmobiliaria</th>
              <th className="px-4 py-3 font-medium">Estatus</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Afiliado</th>
              <th className="px-4 py-3 font-medium">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(clientes ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Sin clientes.
                </td>
              </tr>
            )}
            {(clientes ?? []).map((c) => {
              const af = Array.isArray(c.afiliados) ? c.afiliados[0] : c.afiliados;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/clientes/${c.id}`} className="font-medium text-slate-900 hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.inmobiliaria ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ESTATUS_STYLE[c.estatus] ?? ""
                      }`}
                    >
                      {c.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.origen}</td>
                  <td className="px-4 py-3 text-slate-600">{af?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
      >
        <option value="">Todos</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}
