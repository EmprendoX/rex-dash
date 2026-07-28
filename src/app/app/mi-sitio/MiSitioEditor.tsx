"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMiSitioConfig, publicarMiSitio } from "./actions";

interface Props {
  initialConfig: string;
  siteUrl: string | null;
  isDeployed: boolean;
}

export default function MiSitioEditor({ initialConfig, siteUrl, isDeployed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [config, setConfig] = useState(initialConfig);
  const [dirty, setDirty] = useState(false);

  function run(fn: () => Promise<void>) {
    setNotice(null);
    setIssues(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setNotice(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  function onSave() {
    run(async () => {
      const r = await saveMiSitioConfig(config);
      if (r.ok) {
        setNotice("Guardado. Presioná 'Publicar cambios' cuando quieras que se vean online.");
        setDirty(false);
        router.refresh();
      } else {
        setNotice(r.error);
        if ("issues" in r && r.issues) setIssues(r.issues);
      }
    });
  }

  function onPublicar() {
    if (dirty && !confirm("Tenés cambios sin guardar. Se publicará la última versión guardada (no la actual del editor). ¿Continuar?")) return;
    run(async () => {
      const r = await publicarMiSitio();
      if (r.ok) setNotice(r.note);
      else setNotice(`Error: ${r.error}`);
    });
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {notice}
          {issues && (
            <ul className="mt-2 list-disc list-inside text-xs text-red-700">
              {issues.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
          )}
        </div>
      )}

      {siteUrl && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Tu sitio online</div>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-slate-900 hover:underline"
            >
              {siteUrl.replace(/^https?:\/\//, "")} ↗
            </a>
          </div>
          <button
            type="button"
            onClick={onPublicar}
            disabled={pending || !isDeployed}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title={!isDeployed ? "El sitio todavía no fue desplegado por el equipo RealEX." : ""}
          >
            {pending ? "Enviando…" : "Publicar cambios"}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Contenido del sitio</h2>
          {dirty && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          JSON con todo el contenido: branding, colores, teléfono, propiedades, textos.
          Guardar valida antes de persistir. <strong>Publicar</strong> envía a Netlify para que aparezca online.
        </p>
        <textarea
          value={config}
          onChange={(e) => {
            setConfig(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
          className="mt-3 w-full h-[500px] rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono shadow-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !dirty}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "…" : "Guardar cambios"}
          </button>
          {!dirty && <span className="text-xs text-slate-500">No hay cambios pendientes.</span>}
        </div>
      </div>
    </div>
  );
}
