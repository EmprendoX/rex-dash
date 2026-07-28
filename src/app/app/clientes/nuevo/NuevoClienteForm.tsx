"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCliente } from "./actions";

interface AfiliadoOption {
  id: string;
  nombre: string;
  codigo: string;
}

export default function NuevoClienteForm({
  afiliados,
}: {
  afiliados: AfiliadoOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [origen, setOrigen] = useState<string>("directo");
  const [afiliadoId, setAfiliadoId] = useState<string>("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createCliente(fd);
      if (r.ok) {
        router.push(`/app/clientes/${r.id}`);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos del cliente</h2>

        <Field label="Nombre" required>
          <input name="nombre" required className={inputCls} />
        </Field>

        <Field label="Inmobiliaria">
          <input name="inmobiliaria" className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input name="email" type="email" className={inputCls} />
          </Field>
          <Field label="WhatsApp">
            <input name="whatsapp" placeholder="5215512345678" className={inputCls} />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Atribución</h2>
        <p className="text-xs text-slate-500">
          Si viene de un afiliado, seleccionalo — se van a devengar comisiones sobre sus pagos.
          <br />
          <strong>No editable después</strong> de que exista una comisión pagada (PRD §5).
        </p>

        <Field label="Origen">
          <select
            name="origen"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className={inputCls}
          >
            <option value="directo">Directo</option>
            <option value="afiliado">Afiliado</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="referido">Referido</option>
          </select>
        </Field>

        <Field label={`Afiliado ${origen === "afiliado" ? "(requerido)" : "(opcional)"}`}>
          <select
            name="afiliado_id"
            value={afiliadoId}
            onChange={(e) => setAfiliadoId(e.target.value)}
            className={inputCls}
          >
            <option value="">— sin afiliado —</option>
            {afiliados.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.codigo})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Notas</h2>
        <Field label="Notas internas">
          <textarea name="notas" rows={3} className={inputCls} />
        </Field>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Crear cliente"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
