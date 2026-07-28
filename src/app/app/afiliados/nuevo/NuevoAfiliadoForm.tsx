"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAfiliado } from "./actions";
import { slugify } from "@/lib/format";

export default function NuevoAfiliadoForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoTouched, setCodigoTouched] = useState(false);

  const suggestedCodigo = codigoTouched ? codigo : slugify(nombre);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    // Ensure codigo carries the auto-suggested value if user never typed one.
    fd.set("codigo", suggestedCodigo);
    startTransition(async () => {
      const r = await createAfiliado(fd);
      if (r.ok) {
        router.push("/app/afiliados");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Datos generales</h2>

        <Field label="Nombre" required>
          <input
            name="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Código (se usa en ?ref=)">
          <input
            name="codigo-visible"
            value={suggestedCodigo}
            onChange={(e) => {
              setCodigo(slugify(e.target.value));
              setCodigoTouched(true);
            }}
            placeholder="Se genera del nombre"
            className={`${inputCls} font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Solo letras, números y guiones. Ej: <code>juan-perez</code>.
          </p>
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
        <h2 className="text-sm font-semibold text-slate-900">Datos de pago (opcional)</h2>
        <p className="text-xs text-slate-500">Para liquidar comisiones. Se puede completar después.</p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Banco">
            <input name="banco" className={inputCls} />
          </Field>
          <Field label="CLABE">
            <input name="clabe" maxLength={18} className={`${inputCls} font-mono`} />
          </Field>
        </div>
        <Field label="Titular">
          <input name="titular" className={inputCls} />
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
          {pending ? "Guardando…" : "Crear afiliado"}
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
