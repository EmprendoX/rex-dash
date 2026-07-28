"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPago } from "./actions";
import { FRONTEND_PRICE_MXN } from "@/lib/comisiones/reglas";

interface ClienteOption {
  id: string;
  nombre: string;
  inmobiliaria: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function NuevoPagoForm({
  clientes,
  defaultClienteId,
}: {
  clientes: ClienteOption[];
  defaultClienteId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [concepto, setConcepto] = useState<"frontend" | "mensual" | "upsell">("frontend");
  const [monto, setMonto] = useState(String(FRONTEND_PRICE_MXN));

  function onConceptoChange(v: string) {
    const c = v as "frontend" | "mensual" | "upsell";
    setConcepto(c);
    if (c === "frontend") setMonto(String(FRONTEND_PRICE_MXN));
    else setMonto("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createPago(fd);
      if (r.ok) {
        router.push(`/app/clientes/${r.cliente_id}`);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <Field label="Cliente" required>
          <select name="cliente_id" required defaultValue={defaultClienteId ?? ""} className={inputCls}>
            <option value="" disabled>
              — elegí un cliente —
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.inmobiliaria ? ` — ${c.inmobiliaria}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Concepto" required>
            <select
              name="concepto"
              value={concepto}
              onChange={(e) => onConceptoChange(e.target.value)}
              className={inputCls}
            >
              <option value="frontend">Frontend (venta inicial)</option>
              <option value="mensual">Mensualidad</option>
              <option value="upsell">Upsell / otro</option>
            </select>
          </Field>

          <Field label="Monto MXN" required>
            <input
              name="monto_mxn"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha">
            <input name="fecha" type="date" defaultValue={today()} className={inputCls} />
          </Field>
          <Field label="Método">
            <input name="metodo" placeholder="SPEI / Efectivo / Tarjeta" className={inputCls} />
          </Field>
        </div>

        <Field label="Referencia">
          <input name="referencia" placeholder="Nº de operación, folio, etc." className={inputCls} />
        </Field>

        <p className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <strong>Nota:</strong> si el cliente tiene afiliado atribuido, este pago genera comisión
          automática (30% frontend, 26% mensual/upsell) — se ve en el detalle del cliente y en la
          pantalla de Comisiones.
        </p>
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
          {pending ? "Registrando…" : "Registrar pago"}
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
