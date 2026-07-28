"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSitioForCliente } from "@/app/app/sitios/actions";

export default function CrearSitioButton({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const r = await createSitioForCliente(clienteId);
      if (r.ok) {
        router.push(`/app/sitios/${r.sitio_id}`);
      } else {
        alert(`Error: ${r.error}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? "Creando…" : "Crear sitio para este cliente"}
    </button>
  );
}
